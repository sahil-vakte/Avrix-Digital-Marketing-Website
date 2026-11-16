import { and, asc, eq, ilike } from "drizzle-orm";
import { db, t } from "@/db";

export async function addActivity(leadId: string, type: string, summary: string, metadata?: unknown) {
  await db.insert(t.activities).values({ leadId, type, summary, metadata: (metadata ?? null) as object | null });
}

export async function leadsForEmail(email: string) {
  return db.select({ id: t.leads.id }).from(t.leads).where(ilike(t.leads.email, email));
}

export async function stageByName(name: string) {
  const s = await db.query.pipelineStages.findFirst({ where: ilike(t.pipelineStages.name, name) });
  if (s) return s;
  return (await db.query.pipelineStages.findFirst({ orderBy: asc(t.pipelineStages.order) }))!;
}

/** Find the lead for an email, or create one in the given stage. */
export async function ensureLead(o: {
  email: string; name?: string | null; businessName?: string | null; contactId?: string | null;
  source: "WEBSITE_FORM" | "BOOKING" | "CAMPAIGN_REPLY" | "MANUAL" | "WHATSAPP" | "PHONE" | "OTHER";
  stage?: string; phone?: string | null; country?: string | null; service?: string | null; budget?: string | null;
  message?: string | null; utm?: Record<string, string> | null;
}) {
  const existing = await db.query.leads.findFirst({ where: ilike(t.leads.email, o.email) });
  if (existing) return { lead: existing, created: false };
  const stage = await stageByName(o.stage ?? "New");
  const [lead] = await db.insert(t.leads).values({
    email: o.email.toLowerCase(), name: o.name || o.email, businessName: o.businessName ?? null, contactId: o.contactId ?? null,
    source: o.source, stageId: stage.id, phone: o.phone ?? null, country: o.country ?? null, service: o.service ?? null,
    budget: o.budget ?? null, message: o.message ?? null, utm: o.utm ?? null,
  }).returning();
  return { lead, created: true };
}

export async function moveLeadToStageIfEarlier(leadId: string, stageName: string) {
  const [lead, target] = await Promise.all([
    db.query.leads.findFirst({ where: eq(t.leads.id, leadId), with: { stage: true } }),
    db.query.pipelineStages.findFirst({ where: ilike(t.pipelineStages.name, stageName) }),
  ]);
  if (!lead || !target) return;
  if (lead.stage.order < target.order && !lead.stage.isWon && !lead.stage.isLost) {
    await db.update(t.leads).set({ stageId: target.id }).where(and(eq(t.leads.id, leadId)));
    await addActivity(leadId, "stage_change", `Stage moved to ${target.name} automatically`);
  }
}
