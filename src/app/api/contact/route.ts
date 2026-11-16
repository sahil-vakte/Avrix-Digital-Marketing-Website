import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { addActivity, ensureLead } from "@/lib/crm";
import { alertAdmin } from "@/lib/outbox";
import { normaliseCountry } from "@/lib/countries";
import { isValidSyntax, normaliseEmail } from "@/lib/email-validate";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/merge";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  businessName: z.string().trim().min(1).max(160),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(60).optional().default("GB"),
  service: z.string().trim().max(120).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(1).max(5000),
  marketingConsent: z.boolean().optional().default(false),
  website_url: z.string().optional().default(""), // honeypot
  utm: z.record(z.string()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60_000)) return Response.json({ error: "Too many submissions — please try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Please complete all required fields." }, { status: 400 });
  const b = parsed.data;
  if (b.website_url) return Response.json({ ok: true }); // bot
  const email = normaliseEmail(b.email);
  if (!isValidSyntax(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  const country = normaliseCountry(b.country);
  const [firstName, ...rest] = b.name.split(/\s+/);

  // Contact record (consent only if they ticked the box)
  let contact = await db.query.contacts.findFirst({ where: eq(t.contacts.email, email) });
  if (!contact) {
    [contact] = await db.insert(t.contacts).values({
      email, businessName: b.businessName, firstName, lastName: rest.join(" ") || null, phone: b.phone || null, country,
      source: "Website contact form", consentStatus: b.marketingConsent ? "OPTED_IN" : "NONE",
      consentAt: b.marketingConsent ? new Date() : null, lawfulBasis: b.marketingConsent ? "Consent (website form)" : null, emailStatus: "VALID",
    }).returning();
  } else if (b.marketingConsent && contact.consentStatus !== "OPTED_IN") {
    await db.update(t.contacts).set({ consentStatus: "OPTED_IN", consentAt: new Date(), lawfulBasis: "Consent (website form)" }).where(eq(t.contacts.id, contact.id));
  }

  const { lead, created } = await ensureLead({
    email, name: b.name, businessName: b.businessName, contactId: contact.id, source: "WEBSITE_FORM",
    phone: b.phone || null, country, service: b.service || null, budget: b.budget || null, message: b.message, utm: b.utm,
  });
  await addActivity(lead.id, "form", created ? "Website enquiry received" : "New website enquiry from existing lead", {
    message: b.message, service: b.service, budget: b.budget, utm: b.utm,
  });

  await alertAdmin(`New enquiry: ${b.name} (${b.businessName})`, `
    <p><b>${escapeHtml(b.name)}</b> from <b>${escapeHtml(b.businessName)}</b> (${escapeHtml(country)})</p>
    <p>Email: ${escapeHtml(email)}<br>Phone: ${escapeHtml(b.phone || "—")}<br>Service: ${escapeHtml(b.service || "—")}<br>Budget: ${escapeHtml(b.budget || "—")}</p>
    <blockquote style="border-left:3px solid #ddd;padding-left:10px">${escapeHtml(b.message).replace(/\n/g, "<br>")}</blockquote>
    <p>Source: ${escapeHtml(b.utm.utm_source ?? b.utm.referrer ?? "direct")} · Landing page: ${escapeHtml(b.utm.landing_page ?? "—")}</p>
    <p><a href="${env.appUrl}/admin/leads/${lead.id}">Open in CRM</a></p>`);
  return Response.json({ ok: true });
}
