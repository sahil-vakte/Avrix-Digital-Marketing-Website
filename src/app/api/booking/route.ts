import { infoBox, button } from "@/lib/email-blocks";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db, t } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { availableSlots } from "@/lib/booking";
import { getSetting } from "@/lib/settings";
import { addActivity, ensureLead, moveLeadToStageIfEarlier } from "@/lib/crm";
import { alertAdmin, queueEmail } from "@/lib/outbox";
import { fmtInTz } from "@/lib/time";
import { isValidSyntax, normaliseEmail } from "@/lib/email-validate";
import { escapeHtml } from "@/lib/merge";
import { env } from "@/lib/env";

const Body = z.object({
  name: z.string().trim().min(1).max(120), email: z.string().trim().max(254),
  phone: z.string().trim().max(40).optional().default(""), businessName: z.string().trim().max(160).optional().default(""),
  topic: z.string().trim().max(300).optional().default(""), start: z.string(), website_url: z.string().optional().default(""),
  utm: z.record(z.string()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`booking:${ip}`, 5, 10 * 60_000)) return Response.json({ error: "Too many requests." }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return Response.json({ error: "Please complete the required fields." }, { status: 400 });
  const b = p.data;
  if (b.website_url) return Response.json({ ok: true });
  const email = normaliseEmail(b.email);
  if (!isValidSyntax(email)) return Response.json({ error: "Please enter a valid email." }, { status: 400 });

  const start = new Date(b.start);
  const s = await getSetting("booking");
  const dateStr = fmtInTz(start, s.timezone, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
  const slots = await availableSlots(dateStr);
  if (!slots.some((x) => new Date(x.start).getTime() === start.getTime())) return Response.json({ error: "Sorry, that time was just taken. Please choose another." }, { status: 409 });

  const end = new Date(start.getTime() + s.slotMinutes * 60_000);
  const { lead } = await ensureLead({ email, name: b.name, businessName: b.businessName || null, source: "BOOKING", stage: "Meeting booked", phone: b.phone || null, utm: b.utm, message: b.topic || null });
  await moveLeadToStageIfEarlier(lead.id, "Meeting booked");
  const [booking] = await db.insert(t.bookings).values({ applicationId: lead.applicationId, leadId: lead.id, name: b.name, email, phone: b.phone || null, topic: b.topic || null, startsAt: start, endsAt: end }).returning();
  const when = fmtInTz(start, s.timezone, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + " (UK time)";
  await addActivity(lead.id, "meeting", `Call booked for ${when}`, { bookingId: booking.id, topic: b.topic });

  await queueEmail({
    to: email, kind: "SYSTEM", leadId: lead.id, subject: "Your call with Avrix UK & Europe is booked",
    html: `<p>Hi ${escapeHtml(b.name.split(" ")[0])},</p><p>Thanks for booking a call with us — it's confirmed.</p>${infoBox([["When", escapeHtml(when)], ["Length", `${s.slotMinutes} minutes`], ["How", `We'll call you on ${escapeHtml(b.phone || "the number you provide")} or send a video link beforehand`]])}<p>If you need to rearrange, just reply to this email.</p><p>Best regards,<br>Avrix UK &amp; Europe</p>`,
  });
  await alertAdmin(`Call booked: ${b.name} — ${when}`, `<p>A new call has been booked.</p>${infoBox([["Who", `${escapeHtml(b.name)} · ${escapeHtml(email)}`], ["Phone", escapeHtml(b.phone || "No phone")], ["When", escapeHtml(when)], ["Topic", escapeHtml(b.topic || "—")]])}${button(`${env.appUrl}/admin/leads/${lead.id}`, "Open lead")}`);
  return Response.json({ ok: true, when });
}
