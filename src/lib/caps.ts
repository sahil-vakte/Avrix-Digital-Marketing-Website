// Sending-capacity accounting shared by the worker and the admin UI.
import { and, gte, inArray, isNotNull, sql, asc } from "drizzle-orm";
import { db, t } from "@/db";
import { env } from "./env";

export async function sentSince(since: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.emailMessages)
    .where(and(isNotNull(t.emailMessages.sentAt), gte(t.emailMessages.sentAt, since), inArray(t.emailMessages.status, ["SENT", "BOUNCED"])));
  return row?.n ?? 0;
}

/** Effective daily cap today, taking the warm-up ramp into account. */
export async function effectiveDailyCap(): Promise<{ cap: number; warmupDay: number | null }> {
  const base = env.send.dailyCap;
  if (!env.send.warmupEnabled || env.send.warmupSchedule.length === 0) return { cap: base, warmupDay: null };
  const [first] = await db.select({ sentAt: t.emailMessages.sentAt }).from(t.emailMessages)
    .where(isNotNull(t.emailMessages.sentAt)).orderBy(asc(t.emailMessages.sentAt)).limit(1);
  if (!first?.sentAt) return { cap: Math.min(base, env.send.warmupSchedule[0]), warmupDay: 1 };
  const day = Math.floor((Date.now() - first.sentAt.getTime()) / 86_400_000) + 1;
  if (day > env.send.warmupSchedule.length) return { cap: base, warmupDay: null };
  return { cap: Math.min(base, env.send.warmupSchedule[day - 1]), warmupDay: day };
}

export async function capacity() {
  const now = Date.now();
  const [last24, lastHour, daily] = await Promise.all([
    sentSince(new Date(now - 86_400_000)),
    sentSince(new Date(now - 3_600_000)),
    effectiveDailyCap(),
  ]);
  return {
    last24, lastHour,
    dailyCap: daily.cap, hourlyCap: env.send.hourlyCap, warmupDay: daily.warmupDay,
    remainingToday: Math.max(0, daily.cap - last24),
    remainingThisHour: Math.max(0, env.send.hourlyCap - lastHour),
  };
}

/** Rough sends-per-day achievable given caps and gaps. */
export function throughputPerDay(dailyCap: number) {
  const avgGap = Math.max(1, (env.send.minGap + env.send.maxGap) / 2);
  return Math.max(1, Math.min(dailyCap, env.send.hourlyCap * 24, Math.floor(86_400 / avgGap)));
}
