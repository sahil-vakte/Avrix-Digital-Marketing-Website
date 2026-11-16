import { and, gte, lt, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { getSetting } from "./settings";
import { fmtInTz, isoWeekday, zonedToUtc } from "./time";

export async function availableSlots(date: string) {
  const s = await getSetting("booking");
  if (!s.days.includes(isoWeekday(date))) return [];
  const dayStart = zonedToUtc(date, 0, 0, s.timezone);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const taken = await db.select({ startsAt: t.bookings.startsAt }).from(t.bookings)
    .where(and(gte(t.bookings.startsAt, dayStart), lt(t.bookings.startsAt, dayEnd), eq(t.bookings.status, "CONFIRMED")));
  const takenSet = new Set(taken.map((b) => b.startsAt.getTime()));
  const minStart = Date.now() + 2 * 3_600_000; // at least 2h notice
  const out: { start: string; label: string }[] = [];
  for (let m = s.startHour * 60; m + s.slotMinutes <= s.endHour * 60; m += s.slotMinutes) {
    const start = zonedToUtc(date, Math.floor(m / 60), m % 60, s.timezone);
    if (start.getTime() < minStart || takenSet.has(start.getTime())) continue;
    out.push({ start: start.toISOString(), label: fmtInTz(start, s.timezone, { hour: "2-digit", minute: "2-digit" }) });
  }
  return out;
}
