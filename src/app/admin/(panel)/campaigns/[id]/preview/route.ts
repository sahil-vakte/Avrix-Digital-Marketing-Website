// Renders the email as a chosen contact would receive it (used by the builder's preview iframe).
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { renderEmail } from "@/lib/email-render";
import { contactMergeData } from "@/lib/merge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Unauthorised", { status: 401 });
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, (await params).id), with: { steps: true } });
  if (!c) return new Response("Not found", { status: 404 });
  const contactId = req.nextUrl.searchParams.get("contact");
  const step = Number(req.nextUrl.searchParams.get("step") ?? 0);
  const variant = req.nextUrl.searchParams.get("v") === "B" && c.subjectB ? c.subjectB : c.subjectA;
  const contact = contactId ? await db.query.contacts.findFirst({ where: eq(t.contacts.id, contactId) }) : null;
  const data = contact ? contactMergeData(contact) : { first_name: "Jane", last_name: "Smith", business_name: "Example Ltd", city: "Leicester" };
  const s = step ? c.steps.find((x) => x.order === step) : null;
  const r = await renderEmail({ bodyHtml: s?.html ?? c.html, subject: s?.subject || (step ? `Re: ${variant}` : variant), data, token: "preview", trackOpens: false, trackClicks: false, includeUnsubscribe: true });
  const banner = `<div style="font:12px Arial;background:#f3f4f6;padding:8px 12px;border-bottom:1px solid #e5e7eb"><b>Subject:</b> ${r.subject.replace(/</g, "&lt;")}</div>`;
  return new Response(r.html.replace("<body style=\"margin:0;padding:0;background:#ffffff\">", `<body style="margin:0;padding:0;background:#ffffff">${banner}`), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
