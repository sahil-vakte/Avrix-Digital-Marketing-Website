// Picks the next due message, re-checks eligibility, renders, sends via SMTP,
// and records the outcome. One message per call.
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, t } from "../src/db";
import type { EmailMessage } from "../src/db/schema";
import { env } from "../src/lib/env";
import { capacity } from "../src/lib/caps";
import { classifySmtpError, newMessageId, sendMail } from "../src/lib/mailer";
import { renderEmail } from "../src/lib/email-render";
import { contactMergeData } from "../src/lib/merge";
import { ineligibleReason, type EligibilityContext } from "../src/lib/compliance";
import { eligibilityContext } from "../src/lib/audience";
import { addActivity, leadsForEmail, moveLeadToStageIfEarlier } from "../src/lib/crm";
import { alertAdmin } from "../src/lib/outbox";
import { getRaw, setSetting } from "../src/lib/settings";
import { randomToken } from "../src/lib/crypto";
import { log } from "./log";

let ctxCache: { at: number; ctx: EligibilityContext } | null = null;
async function ctx() {
  if (!ctxCache || Date.now() - ctxCache.at > 60_000) ctxCache = { at: Date.now(), ctx: await eligibilityContext() };
  return ctxCache.ctx;
}
export const invalidateEligibilityCache = () => { ctxCache = null; };

const tzCache = new Map<string, string>();
async function tzFor(country: string) {
  if (!tzCache.size) for (const r of await db.select().from(t.countryRules)) tzCache.set(r.countryCode, r.timezone);
  return tzCache.get(country) ?? "Europe/London";
}

export function inSendWindow(now: Date, tz: string, days: number[], startHour: number, endHour: number) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const iso = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1;
  return days.includes(iso) && hour >= startHour && hour < endHour;
}

export type SendResult = "sent" | "idle" | "capped" | "paused" | "skipped" | "failed";

export async function globalPause(): Promise<{ until: number; reason: string } | null> {
  const p = await getRaw<{ until: number; reason: string }>("sending.pause");
  return p && p.until > Date.now() ? p : null;
}

export async function sendNext(): Promise<SendResult> {
  if (await globalPause()) return "paused";
  const cap = await capacity();
  if (cap.remainingToday <= 0 || cap.remainingThisHour <= 0) return "capped";

  const now = new Date();
  // Candidates: non-campaign mail first, then campaign mail for campaigns that are SENDING.
  const candidates = await db
    .select({ m: t.emailMessages, c: t.campaigns })
    .from(t.emailMessages)
    .leftJoin(t.campaigns, eq(t.campaigns.id, t.emailMessages.campaignId))
    .where(and(
      eq(t.emailMessages.status, "QUEUED"),
      lte(t.emailMessages.scheduledFor, now),
      or(isNull(t.emailMessages.campaignId), eq(t.campaigns.status, "SENDING")),
    ))
    .orderBy(sql`case ${t.emailMessages.kind} when 'SYSTEM' then 0 when 'TEST' then 0 when 'ONE_TO_ONE' then 1 when 'FOLLOW_UP' then 2 else 3 end`, asc(t.emailMessages.scheduledFor))
    .limit(100);
  if (!candidates.length) return "idle";

  for (const { m, c } of candidates) {
    if (c && (m.kind === "CAMPAIGN" || m.kind === "FOLLOW_UP")) {
      const rec = m.recipientId ? await db.query.campaignRecipients.findFirst({ where: eq(t.campaignRecipients.id, m.recipientId), with: { contact: true } }) : null;
      const tz = c.useRecipientTz && rec?.contact ? await tzFor(rec.contact.country) : "Europe/London";
      if (!inSendWindow(now, tz, c.sendDays, c.sendStartHour, c.sendEndHour)) continue;
    }
    // Atomically claim the message.
    const [claimed] = await db.update(t.emailMessages)
      .set({ status: "SENDING", attempts: sql`${t.emailMessages.attempts} + 1` })
      .where(and(eq(t.emailMessages.id, m.id), eq(t.emailMessages.status, "QUEUED")))
      .returning();
    if (!claimed) continue;
    return deliver(claimed, c);
  }
  return "idle"; // everything due is outside its send window
}

async function deliver(m: EmailMessage, c: typeof t.campaigns.$inferSelect | null): Promise<SendResult> {
  try {
    let html: string;
    let subject = m.subject;
    let includeUnsubscribe = false;
    let trackOpens = true, trackClicks = true;
    let data = {};
    let inReplyTo: string | null = m.inReplyTo;
    let fromName: string | undefined;
    let replyTo: string | null = null;

    if (m.kind === "CAMPAIGN" || m.kind === "FOLLOW_UP") {
      if (!c || !m.recipientId) return cancel(m, "Campaign or recipient missing");
      const rec = await db.query.campaignRecipients.findFirst({ where: eq(t.campaignRecipients.id, m.recipientId), with: { contact: true } });
      if (!rec) return cancel(m, "Recipient missing");
      if (!["QUEUED", "ACTIVE"].includes(rec.status)) return cancel(m, `Recipient is ${rec.status.toLowerCase()}`);
      if (!rec.contact) return cancel(m, "Contact deleted");
      const reason = ineligibleReason(rec.contact, await ctx());
      if (reason) {
        await db.update(t.campaignRecipients).set({ status: "EXCLUDED", excludeReason: reason }).where(eq(t.campaignRecipients.id, rec.id));
        await db.update(t.emailMessages).set({ status: "CANCELLED" }).where(and(eq(t.emailMessages.recipientId, rec.id), eq(t.emailMessages.status, "QUEUED")));
        return cancel(m, reason);
      }
      if (m.kind === "FOLLOW_UP") {
        const step = await db.query.sequenceSteps.findFirst({ where: and(eq(t.sequenceSteps.campaignId, c.id), eq(t.sequenceSteps.order, m.stepOrder)) });
        if (!step) return cancel(m, "Sequence step removed");
        html = step.html;
      } else html = c.html;
      data = contactMergeData(rec.contact);
      includeUnsubscribe = true;
      trackOpens = c.trackOpens; trackClicks = c.trackClicks;
      fromName = c.fromName; replyTo = c.replyTo;
    } else {
      html = m.html ?? "";
      trackClicks = m.kind === "ONE_TO_ONE";
      trackOpens = m.kind === "ONE_TO_ONE";
      if (m.kind === "SYSTEM" || m.kind === "TEST") { trackOpens = false; trackClicks = false; }
    }

    const rendered = await renderEmail({
      bodyHtml: html, subject, data, token: m.token, trackOpens, trackClicks, includeUnsubscribe,
      linkId: async (url) => {
        const campaignId = m.campaignId ?? null;
        const found = await db.query.links.findFirst({
          where: campaignId ? and(eq(t.links.campaignId, campaignId), eq(t.links.url, url)) : and(isNull(t.links.campaignId), eq(t.links.url, url)),
        });
        if (found) return found.id;
        const [l] = await db.insert(t.links).values({ campaignId, url }).onConflictDoNothing().returning();
        if (l) return l.id;
        return (await db.query.links.findFirst({ where: and(eq(t.links.campaignId, campaignId!), eq(t.links.url, url)) }))!.id;
      },
    });
    subject = rendered.subject;
    const messageId = newMessageId(m.token);
    await sendMail({
      to: m.toEmail, subject, html: rendered.html, text: rendered.text, fromName, replyTo,
      messageId, inReplyTo, references: inReplyTo, headers: rendered.headers,
    });

    const sentAt = new Date();
    await db.update(t.emailMessages).set({ status: "SENT", sentAt, messageId, subject, lastError: null }).where(eq(t.emailMessages.id, m.id));
    await db.insert(t.emailEvents).values({ type: "SENT", messageId: m.id, recipientId: m.recipientId });
    await db.update(t.contacts).set({ lastEmailedAt: sentAt }).where(eq(t.contacts.email, m.toEmail));
    if (m.recipientId && c) await afterCampaignSend(m, c, messageId, sentAt);
    if (m.kind === "ONE_TO_ONE" && m.leadId) await addActivity(m.leadId, "email_sent", `Email sent: “${subject}”`, { messageId: m.id });
    log.info(`sent ${m.kind.toLowerCase()} → ${m.toEmail}`);
    return "sent";
  } catch (err) {
    return handleError(m, c, err);
  }
}

async function afterCampaignSend(m: EmailMessage, c: typeof t.campaigns.$inferSelect, messageId: string, sentAt: Date) {
  const steps = await db.select().from(t.sequenceSteps).where(eq(t.sequenceSteps.campaignId, c.id)).orderBy(asc(t.sequenceSteps.order));
  const next = steps.find((s) => s.order === m.stepOrder + 1);
  if (m.stepOrder === 0) {
    await db.update(t.campaignRecipients).set({ status: next ? "ACTIVE" : "COMPLETED" }).where(eq(t.campaignRecipients.id, m.recipientId!));
    for (const l of await leadsForEmail(m.toEmail)) {
      await addActivity(l.id, "email_sent", `Campaign “${c.name}” sent`, { campaignId: c.id });
      await moveLeadToStageIfEarlier(l.id, "Contacted");
    }
  } else if (!next) {
    await db.update(t.campaignRecipients).set({ status: "COMPLETED" })
      .where(and(eq(t.campaignRecipients.id, m.recipientId!), eq(t.campaignRecipients.status, "ACTIVE")));
  }
  if (next) {
    // Thread follow-ups under the first email.
    const first = m.stepOrder === 0 ? { messageId, subject: m.subject } :
      await db.query.emailMessages.findFirst({ where: and(eq(t.emailMessages.recipientId, m.recipientId!), eq(t.emailMessages.stepOrder, 0)) });
    const baseSubject = (first?.subject ?? m.subject).replace(/^re:\s*/i, "");
    await db.insert(t.emailMessages).values({
      kind: "FOLLOW_UP", campaignId: c.id, recipientId: m.recipientId, stepOrder: next.order, toEmail: m.toEmail,
      subject: next.subject?.trim() ? next.subject : `Re: ${baseSubject}`,
      token: randomToken(), scheduledFor: new Date(sentAt.getTime() + next.delayDays * 86_400_000),
      inReplyTo: first?.messageId ?? messageId,
    });
  }
}

async function cancel(m: EmailMessage, reason: string): Promise<SendResult> {
  await db.update(t.emailMessages).set({ status: "CANCELLED", lastError: reason }).where(eq(t.emailMessages.id, m.id));
  log.info(`skipped → ${m.toEmail}: ${reason}`);
  return "skipped";
}

async function handleError(m: EmailMessage, c: typeof t.campaigns.$inferSelect | null, err: unknown): Promise<SendResult> {
  const { kind, message } = classifySmtpError(err);
  log.warn(`send failed (${kind}) → ${m.toEmail}: ${message}`);
  if (kind === "permanent") {
    await markBounced(m.toEmail, m.id, m.recipientId, message);
    if (c) await checkBounceRate(c.id);
    return "failed";
  }
  if (kind === "limit" || kind === "auth") {
    // Put the message back and pause all sending for an hour.
    await db.update(t.emailMessages).set({ status: "QUEUED", attempts: sql`greatest(${t.emailMessages.attempts} - 1, 0)`, lastError: message }).where(eq(t.emailMessages.id, m.id));
    const prev = await globalPause();
    await setSetting("sending.pause", { until: Date.now() + 3_600_000, reason: `${kind === "auth" ? "SMTP login failed" : "Google sending limit reached"}: ${message}` });
    if (!prev) await alertAdmin(kind === "auth" ? "SMTP authentication failed — sending paused" : "Sending limit reached — sending paused for 1 hour",
      `<p>The worker paused all sending for one hour.</p><p><b>Server response:</b> ${escape(message)}</p><p>Check Admin → Settings → Sending.</p>`);
    return "paused";
  }
  const attempts = m.attempts;
  if (attempts < 4) {
    await db.update(t.emailMessages).set({ status: "QUEUED", lastError: message, scheduledFor: new Date(Date.now() + attempts * 5 * 60_000) }).where(eq(t.emailMessages.id, m.id));
  } else {
    await db.update(t.emailMessages).set({ status: "FAILED", lastError: message }).where(eq(t.emailMessages.id, m.id));
    if (m.recipientId) await db.update(t.campaignRecipients).set({ status: "FAILED" }).where(eq(t.campaignRecipients.id, m.recipientId));
  }
  return "failed";
}

export async function markBounced(email: string, messageDbId: string | null, recipientId: string | null, detail: string) {
  const e = email.toLowerCase();
  const now = new Date();
  if (messageDbId) await db.update(t.emailMessages).set({ status: "BOUNCED", lastError: detail.slice(0, 500) }).where(eq(t.emailMessages.id, messageDbId));
  await db.insert(t.emailEvents).values({ type: "BOUNCE", messageId: messageDbId, recipientId });
  await db.insert(t.suppressions).values({ email: e, reason: "HARD_BOUNCE", note: detail.slice(0, 300) }).onConflictDoNothing();
  await db.update(t.contacts).set({ emailStatus: "BOUNCED" }).where(eq(t.contacts.email, e));
  await db.update(t.campaignRecipients).set({ status: "BOUNCED", bouncedAt: now })
    .where(and(eq(t.campaignRecipients.email, e), inArray(t.campaignRecipients.status, ["QUEUED", "HELD", "ACTIVE", "COMPLETED"])));
  await db.update(t.emailMessages).set({ status: "CANCELLED", lastError: "Address bounced" })
    .where(and(eq(t.emailMessages.toEmail, e), eq(t.emailMessages.status, "QUEUED")));
  invalidateEligibilityCache();
}

export async function checkBounceRate(campaignId: string) {
  const [r] = await db.select({
    sent: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('SENT','BOUNCED'))::int`,
    bounced: sql<number>`count(*) filter (where ${t.emailMessages.status} = 'BOUNCED')::int`,
  }).from(t.emailMessages).where(eq(t.emailMessages.campaignId, campaignId));
  if (r.sent >= env.send.bouncePauseMinSent && r.bounced / r.sent > env.send.bouncePauseThreshold) {
    const [c] = await db.update(t.campaigns)
      .set({ status: "PAUSED", pauseReason: `Auto-paused: bounce rate ${((r.bounced / r.sent) * 100).toFixed(1)}% is above ${(env.send.bouncePauseThreshold * 100).toFixed(0)}%` })
      .where(and(eq(t.campaigns.id, campaignId), eq(t.campaigns.status, "SENDING"))).returning();
    if (c) await alertAdmin(`Campaign “${c.name}” auto-paused`, `<p>${escape(c.pauseReason ?? "")}</p><p>Clean the list before resuming.</p>`);
  }
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
