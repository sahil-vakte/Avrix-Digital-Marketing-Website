// Audience building: lists + segments → eligible recipients (with exclusion reasons).
import { and, arrayOverlaps, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import type { Contact, SegmentRules } from "@/db/schema";
import { ineligibleReason, type EligibilityContext } from "./compliance";
import { getSetting } from "./settings";
import { randomToken } from "./crypto";

export function segmentWhere(r: SegmentRules): SQL | undefined {
  const c: SQL[] = [];
  if (r.countries?.length) c.push(inArray(t.contacts.country, r.countries));
  if (r.businessTypes?.length) c.push(inArray(t.contacts.businessType, r.businessTypes as Contact["businessType"][]));
  if (r.consentStatuses?.length) c.push(inArray(t.contacts.consentStatus, r.consentStatuses as Contact["consentStatus"][]));
  if (r.tags?.length) c.push(arrayOverlaps(t.contacts.tags, r.tags));
  if (r.notEmailedDays && r.notEmailedDays > 0) {
    const d = new Date(Date.now() - r.notEmailedDays * 86_400_000);
    c.push(or(isNull(t.contacts.lastEmailedAt), lt(t.contacts.lastEmailedAt, d))!);
  }
  if (r.search) {
    const q = `%${r.search}%`;
    c.push(or(ilike(t.contacts.email, q), ilike(t.contacts.businessName, q), ilike(t.contacts.firstName, q))!);
  }
  return c.length ? and(...c) : undefined;
}

export async function contactsForLists(listIds: string[]): Promise<Contact[]> {
  if (!listIds.length) return [];
  const ls = await db.select().from(t.lists).where(inArray(t.lists.id, listIds));
  const byId = new Map<string, Contact>();
  const staticIds = ls.filter((l) => l.type === "STATIC").map((l) => l.id);
  if (staticIds.length) {
    const rows = await db.select({ c: t.contacts }).from(t.listMembers)
      .innerJoin(t.contacts, eq(t.contacts.id, t.listMembers.contactId))
      .where(inArray(t.listMembers.listId, staticIds));
    for (const r of rows) byId.set(r.c.id, r.c);
  }
  for (const l of ls.filter((x) => x.type === "SEGMENT")) {
    const where = segmentWhere(l.segmentRules ?? {});
    const rows = await db.select().from(t.contacts).where(where);
    for (const c of rows) byId.set(c.id, c);
  }
  return [...byId.values()];
}

export async function eligibilityContext(): Promise<EligibilityContext> {
  const [sup, rules, comp] = await Promise.all([
    db.select({ email: t.suppressions.email }).from(t.suppressions),
    db.select().from(t.countryRules),
    getSetting("compliance"),
  ]);
  return {
    suppressed: new Set(sup.map((s) => s.email.toLowerCase())),
    countryRules: new Map(rules.map((r) => [r.countryCode, r])),
    unknownTypeRequiresConsent: comp.unknownTypeRequiresConsent,
  };
}

export async function previewAudience(listIds: string[]) {
  const [contacts, ctx] = await Promise.all([contactsForLists(listIds), eligibilityContext()]);
  const reasons = new Map<string, number>();
  let eligible = 0;
  for (const c of contacts) {
    const r = ineligibleReason(c, ctx);
    if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1);
    else eligible++;
  }
  return { total: contacts.length, eligible, excluded: [...reasons.entries()].map(([reason, count]) => ({ reason, count })) };
}

/** Creates recipients + initial messages. Called once when a campaign is launched. */
export async function materializeCampaign(campaignId: string) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found");
  const [contacts, ctx] = await Promise.all([contactsForLists(campaign.listIds), eligibilityContext()]);

  const eligible: Contact[] = [];
  const excluded: { c: Contact; reason: string }[] = [];
  for (const c of contacts) {
    const r = ineligibleReason(c, ctx);
    if (r) excluded.push({ c, reason: r }); else eligible.push(c);
  }

  // Shuffle so the A/B slice is random.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  const ab = !!campaign.subjectB?.trim();
  const testSize = ab ? Math.max(2, Math.ceil((eligible.length * campaign.abTestPercent) / 100)) : eligible.length;
  const startAt = campaign.scheduledAt && campaign.scheduledAt > new Date() ? campaign.scheduledAt : new Date();

  await db.transaction(async (tx) => {
    const chunk = 500;
    for (let i = 0; i < eligible.length; i += chunk) {
      const part = eligible.slice(i, i + chunk);
      const recRows = part.map((c, k) => {
        const idx = i + k;
        const inTest = idx < testSize;
        const variant = !ab ? "A" : inTest ? (idx % 2 === 0 ? "A" : "B") : null;
        return {
          campaignId, contactId: c.id, email: c.email.toLowerCase(), variant, token: randomToken(),
          status: (variant ? "QUEUED" : "HELD") as "QUEUED" | "HELD",
        };
      });
      const inserted = await tx.insert(t.campaignRecipients).values(recRows).onConflictDoNothing().returning();
      const msgs = inserted.filter((r) => r.variant).map((r) => ({
        kind: "CAMPAIGN" as const, campaignId, recipientId: r.id, stepOrder: 0, toEmail: r.email,
        subject: r.variant === "B" ? campaign.subjectB! : campaign.subjectA, token: randomToken(), scheduledFor: startAt,
      }));
      if (msgs.length) await tx.insert(t.emailMessages).values(msgs);
    }
    for (let i = 0; i < excluded.length; i += chunk) {
      const part = excluded.slice(i, i + chunk).map(({ c, reason }) => ({
        campaignId, contactId: c.id, email: c.email.toLowerCase(), token: randomToken(),
        status: "EXCLUDED" as const, excludeReason: reason,
      }));
      await tx.insert(t.campaignRecipients).values(part).onConflictDoNothing();
    }
    await tx.update(t.campaigns).set({
      status: startAt > new Date() ? "SCHEDULED" : "SENDING",
      launchedAt: new Date(),
      scheduledAt: startAt,
      abTestEndsAt: ab ? new Date(startAt.getTime() + campaign.abWaitHours * 3_600_000) : null,
    }).where(eq(t.campaigns.id, campaignId));
  });
  return { eligible: eligible.length, excluded: excluded.length, testSize: ab ? testSize : null };
}

export async function countContacts(where?: SQL) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(t.contacts).where(where);
  return r?.n ?? 0;
}
