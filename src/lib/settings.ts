import { eq } from "drizzle-orm";
import { db, t } from "@/db";

export type BookingSettings = { days: number[]; startHour: number; endHour: number; slotMinutes: number; timezone: string; leadDays: number };
export type ComplianceSettings = { unknownTypeRequiresConsent: boolean; requireApprovalForStaff: boolean; retentionMonths: number };

export const DEFAULTS = {
  booking: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, slotMinutes: 30, timezone: "Europe/London", leadDays: 21 } as BookingSettings,
  compliance: { unknownTypeRequiresConsent: true, requireApprovalForStaff: false, retentionMonths: 24 } as ComplianceSettings,
};

export async function getSetting<K extends keyof typeof DEFAULTS>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await db.query.settings.findFirst({ where: eq(t.settings.key, key) });
  return { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as (typeof DEFAULTS)[K];
}

export async function setSetting(key: string, value: unknown) {
  await db.insert(t.settings).values({ key, value: value as object })
    .onConflictDoUpdate({ target: t.settings.key, set: { value: value as object, updatedAt: new Date() } });
}

export async function getRaw<T>(key: string): Promise<T | null> {
  const row = await db.query.settings.findFirst({ where: eq(t.settings.key, key) });
  return (row?.value as T) ?? null;
}
