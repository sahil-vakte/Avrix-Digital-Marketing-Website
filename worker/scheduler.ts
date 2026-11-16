// Campaign state transitions: scheduled → sending, A/B winner selection, completion.
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db, t } from "../src/db";
import { randomToken } from "../src/lib/crypto";
import { setSetting } from "../src/lib/settings";
import { log } from "./log";

export async function tick() {
  const now = new Date();

  // 1) Scheduled campaigns whose time has come
  const started = await db.update(t.campaigns).set({ status: "SENDING" })
    .where(and(eq(t.campaigns.status, "SCHEDULED"), lte(t.campaigns.scheduledAt, now))).returning({ id: t.campaigns.id, name: t.campaigns.name });
  for (const c of started) log.info(`campaign started: ${c.name}`);

  // 2) A/B winner selection
  const abCampaigns = await db.select().from(t.campaigns).where(and(
    eq(t.campaigns.status, "SENDING"), isNull(t.campaigns.abWinner), lte(t.campaigns.abTestEndsAt, now),
  ));
  for (const c of abCampaigns) {
    if (!c.subjectB) continue;
    const [pending] = await db.select({ n: sql<number>`count(*)::int` }).from(t.emailMessages)
      .where(and(eq(t.emailMessages.campaignId, c.id), eq(t.emailMessages.stepOrder, 0), inArray(t.emailMessages.status, ["QUEUED", "SENDING"])));
    if (pending.n > 0) continue; // test slice still sending
    const stats = await db.select({
      variant: t.campaignRecipients.variant,
      sent: sql<number>`count(*)::int`,
      opened: sql<number>`count(*) filter (where ${t.campaignRecipients.openCount} > 0)::int`,
      replied: sql<number>`count(*) filter (where ${t.campaignRecipients.repliedAt} is not null)::int`,
    }).from(t.campaignRecipients)
      .where(and(eq(t.campaignRecipients.campaignId, c.id), inArray(t.campaignRecipients.variant, ["A", "B"])))
      .groupBy(t.campaignRecipients.variant);
    const rate = (v: string) => {
      const s = stats.find((x) => x.variant === v);
      if (!s || !s.sent) return 0;
      return (c.abWinnerMetric === "reply" ? s.replied : s.opened) / s.sent;
    };
    const winner = rate("B") > rate("A") ? "B" : "A";
    const subject = winner === "B" ? c.subjectB : c.subjectA;
    await db.transaction(async (tx) => {
      await tx.update(t.campaigns).set({ abWinner: winner }).where(eq(t.campaigns.id, c.id));
      const held = await tx.update(t.campaignRecipients).set({ variant: winner, status: "QUEUED" })
        .where(and(eq(t.campaignRecipients.campaignId, c.id), eq(t.campaignRecipients.status, "HELD"))).returning();
      for (let i = 0; i < held.length; i += 500) {
        await tx.insert(t.emailMessages).values(held.slice(i, i + 500).map((r) => ({
          kind: "CAMPAIGN" as const, campaignId: c.id, recipientId: r.id, stepOrder: 0, toEmail: r.email,
          subject, token: randomToken(), scheduledFor: new Date(),
        })));
      }
      log.info(`A/B winner for ${c.name}: ${winner} (A ${(rate("A") * 100).toFixed(1)}% vs B ${(rate("B") * 100).toFixed(1)}%), ${held.length} queued`);
    });
  }

  // 3) Completion: nothing queued/sending and no held recipients
  const sending = await db.select({ id: t.campaigns.id, name: t.campaigns.name }).from(t.campaigns).where(eq(t.campaigns.status, "SENDING"));
  for (const c of sending) {
    const [open] = await db.select({ n: sql<number>`count(*)::int` }).from(t.emailMessages)
      .where(and(eq(t.emailMessages.campaignId, c.id), inArray(t.emailMessages.status, ["QUEUED", "SENDING"])));
    const [held] = await db.select({ n: sql<number>`count(*)::int` }).from(t.campaignRecipients)
      .where(and(eq(t.campaignRecipients.campaignId, c.id), eq(t.campaignRecipients.status, "HELD")));
    if (open.n === 0 && held.n === 0) {
      await db.update(t.campaigns).set({ status: "COMPLETED", completedAt: now }).where(eq(t.campaigns.id, c.id));
      await db.update(t.campaignRecipients).set({ status: "COMPLETED" })
        .where(and(eq(t.campaignRecipients.campaignId, c.id), inArray(t.campaignRecipients.status, ["ACTIVE", "QUEUED"])));
      log.info(`campaign completed: ${c.name}`);
    }
  }

  await setSetting("worker.heartbeat", { at: now.toISOString(), pid: process.pid });
}

/** On startup: a message left in SENDING means the worker stopped mid-send. Requeue it. */
export async function releaseStuck() {
  const r = await db.update(t.emailMessages).set({ status: "QUEUED" })
    .where(and(eq(t.emailMessages.status, "SENDING"), sql`${t.emailMessages.sentAt} is null`)).returning({ id: t.emailMessages.id });
  if (r.length) log.warn(`requeued ${r.length} message(s) left in SENDING`);
}
