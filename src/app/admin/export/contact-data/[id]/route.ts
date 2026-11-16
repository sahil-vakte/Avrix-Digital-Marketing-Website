// Subject access request: everything we hold about one contact, as JSON.
import { eq, inArray } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Unauthorised", { status: 401 });
  const c = await db.query.contacts.findFirst({ where: eq(t.contacts.id, (await params).id), with: { lists: { with: { list: true } } } });
  if (!c) return new Response("Not found", { status: 404 });
  const leads = await db.query.leads.findMany({ where: eq(t.leads.email, c.email), with: { notes: true, activities: true, bookings: true } });
  const recipients = await db.select().from(t.campaignRecipients).where(eq(t.campaignRecipients.email, c.email));
  const messages = await db.select({ subject: t.emailMessages.subject, kind: t.emailMessages.kind, status: t.emailMessages.status, sentAt: t.emailMessages.sentAt, openCount: t.emailMessages.openCount, clickCount: t.emailMessages.clickCount })
    .from(t.emailMessages).where(eq(t.emailMessages.toEmail, c.email));
  const events = recipients.length ? await db.select({ type: t.emailEvents.type, createdAt: t.emailEvents.createdAt }).from(t.emailEvents).where(inArray(t.emailEvents.recipientId, recipients.map((r) => r.id))) : [];
  const sup = await db.query.suppressions.findFirst({ where: eq(t.suppressions.email, c.email) });
  await audit(s.uid, "export_subject_data", "contact", c.id);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), contact: { ...c, lists: c.lists.map((l) => l.list.name) }, leads, campaigns: recipients, emails: messages, events, suppression: sup ?? null }, null, 2);
  return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="subject-access-${c.id}.json"` } });
}
