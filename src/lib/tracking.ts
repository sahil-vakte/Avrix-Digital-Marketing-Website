// Records opens, clicks and unsubscribes from the public tracking endpoints.
import { eq, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { hashIp } from "./crypto";
import { addActivity, leadsForEmail } from "./crm";

const BOT_UA = /(bot|crawler|spider|preview|scanner|barracuda|mimecast|proofpoint|safelinks|urldefense)/i;

export async function findMessageByToken(token: string) {
  return db.query.emailMessages.findFirst({ where: eq(t.emailMessages.token, token), with: { recipient: true } });
}

export async function recordOpen(token: string, ua: string | null, ip: string | null) {
  const m = await findMessageByToken(token);
  if (!m) return;
  const sinceSend = m.sentAt ? Date.now() - m.sentAt.getTime() : 0;
  // Apple Mail Privacy Protection / security scanners pre-load images seconds after delivery.
  const machine = sinceSend < 60_000 || BOT_UA.test(ua ?? "");
  await db.insert(t.emailEvents).values({
    type: "OPEN", messageId: m.id, recipientId: m.recipientId, userAgent: ua?.slice(0, 300) ?? null, ipHash: hashIp(ip), machine,
  });
  if (machine) return;
  const now = new Date();
  await db.update(t.emailMessages).set({ openCount: sql`${t.emailMessages.openCount} + 1` }).where(eq(t.emailMessages.id, m.id));
  if (m.recipientId) {
    await db.update(t.campaignRecipients).set({
      openCount: sql`${t.campaignRecipients.openCount} + 1`,
      firstOpenAt: sql`coalesce(${t.campaignRecipients.firstOpenAt}, ${now})`,
      lastOpenAt: now,
    }).where(eq(t.campaignRecipients.id, m.recipientId));
  }
  await db.update(t.contacts).set({ lastEngagedAt: now }).where(eq(t.contacts.email, m.toEmail));
  if (m.openCount === 0) for (const l of await leadsForEmail(m.toEmail)) await addActivity(l.id, "email_open", `Opened “${m.subject}”`);
}

export async function recordClick(token: string, linkId: string | null, ua: string | null, ip: string | null) {
  const m = await findMessageByToken(token);
  const link = linkId ? await db.query.links.findFirst({ where: eq(t.links.id, linkId) }) : null;
  if (!m) return link?.url ?? null;
  const machine = BOT_UA.test(ua ?? "");
  await db.insert(t.emailEvents).values({
    type: "CLICK", messageId: m.id, recipientId: m.recipientId, linkId: link?.id ?? null,
    userAgent: ua?.slice(0, 300) ?? null, ipHash: hashIp(ip), machine,
  });
  if (!machine) {
    const now = new Date();
    await db.update(t.emailMessages).set({ clickCount: sql`${t.emailMessages.clickCount} + 1` }).where(eq(t.emailMessages.id, m.id));
    if (m.recipientId)
      await db.update(t.campaignRecipients).set({ clickCount: sql`${t.campaignRecipients.clickCount} + 1` }).where(eq(t.campaignRecipients.id, m.recipientId));
    await db.update(t.contacts).set({ lastEngagedAt: now }).where(eq(t.contacts.email, m.toEmail));
    for (const l of await leadsForEmail(m.toEmail)) await addActivity(l.id, "email_click", `Clicked ${link?.url ?? "a link"} in “${m.subject}”`);
  }
  return link?.url ?? null;
}

export async function unsubscribeByToken(token: string, how: "page" | "one-click" | "reply") {
  const m = await findMessageByToken(token);
  if (!m) return false;
  return unsubscribeEmail(m.toEmail, { messageId: m.id, recipientId: m.recipientId, how });
}

export async function unsubscribeEmail(email: string, o: { messageId?: string | null; recipientId?: string | null; how: string }) {
  const e = email.toLowerCase();
  await db.insert(t.suppressions).values({ email: e, reason: "UNSUBSCRIBED", note: `via ${o.how}` }).onConflictDoNothing();
  const now = new Date();
  await db.insert(t.emailEvents).values({ type: "UNSUBSCRIBE", messageId: o.messageId ?? null, recipientId: o.recipientId ?? null });
  // Stop every pending send to this address, across all campaigns.
  await db.update(t.campaignRecipients).set({ status: "UNSUBSCRIBED", unsubscribedAt: now })
    .where(sql`${t.campaignRecipients.email} = ${e} and ${t.campaignRecipients.status} in ('QUEUED','HELD','ACTIVE','COMPLETED')`);
  await db.update(t.emailMessages).set({ status: "CANCELLED", lastError: "Unsubscribed" })
    .where(sql`${t.emailMessages.toEmail} = ${e} and ${t.emailMessages.status} = 'QUEUED' and ${t.emailMessages.kind} in ('CAMPAIGN','FOLLOW_UP')`);
  await db.update(t.contacts).set({ consentStatus: "NONE" }).where(eq(t.contacts.email, e));
  for (const l of await leadsForEmail(e)) await addActivity(l.id, "unsubscribe", "Unsubscribed from marketing email");
  return true;
}
