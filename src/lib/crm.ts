import { and, asc, eq, ilike } from "drizzle-orm";
import { db, t } from "@/db";
import { decrypt } from "./crypto";

/** The application this marketing website's own forms belong to. */
export const HOME_APP_KEY = "avrix-europe";

export async function addActivity(leadId: string, type: string, summary: string, metadata?: unknown) {
  await db.insert(t.activities).values({ leadId, type, summary, metadata: (metadata ?? null) as object | null });
}

export async function applicationByKey(key: string) {
  return db.query.applications.findFirst({ where: eq(t.applications.key, key) });
}

export async function homeApplicationId(): Promise<string> {
  const app = (await applicationByKey(HOME_APP_KEY)) ?? (await db.query.applications.findFirst({ orderBy: asc(t.applications.sortOrder) }));
  if (!app) throw new Error("No applications configured. Run `npm run db:migrate && npm run db:seed`.");
  return app.id;
}

export async function leadsForEmail(email: string, applicationId?: string | null) {
  return db.select({ id: t.leads.id }).from(t.leads)
    .where(applicationId ? and(ilike(t.leads.email, email), eq(t.leads.applicationId, applicationId)) : ilike(t.leads.email, email));
}

/** Stage by name within one application's pipeline, falling back to its first stage. */
export async function stageByName(applicationId: string, name: string) {
  const s = await db.query.pipelineStages.findFirst({ where: and(eq(t.pipelineStages.applicationId, applicationId), ilike(t.pipelineStages.name, name)) });
  if (s) return s;
  const first = await db.query.pipelineStages.findFirst({ where: eq(t.pipelineStages.applicationId, applicationId), orderBy: asc(t.pipelineStages.order) });
  if (!first) throw new Error("This application has no pipeline stages yet. Add them in Settings → Applications.");
  return first;
}

/** Find the lead for an email within an application, or create one in the given stage. */
export async function ensureLead(o: {
  applicationId?: string | null;
  email: string; name?: string | null; businessName?: string | null; contactId?: string | null;
  source: "WEBSITE_FORM" | "BOOKING" | "CAMPAIGN_REPLY" | "MANUAL" | "WHATSAPP" | "PHONE" | "OTHER";
  stage?: string; phone?: string | null; country?: string | null; service?: string | null; budget?: string | null;
  message?: string | null; utm?: Record<string, string> | null;
}) {
  const applicationId = o.applicationId ?? (await homeApplicationId());
  const existing = await db.query.leads.findFirst({ where: and(eq(t.leads.applicationId, applicationId), ilike(t.leads.email, o.email)) });
  if (existing) return { lead: existing, created: false };
  const stage = await stageByName(applicationId, o.stage ?? "New");
  const [lead] = await db.insert(t.leads).values({
    applicationId,
    email: o.email.toLowerCase(), name: o.name || o.email, businessName: o.businessName ?? null, contactId: o.contactId ?? null,
    source: o.source, stageId: stage.id, phone: o.phone ?? null, country: o.country ?? null, service: o.service ?? null,
    budget: o.budget ?? null, message: o.message ?? null, utm: o.utm ?? null,
  }).returning();
  return { lead, created: true };
}

export async function moveLeadToStageIfEarlier(leadId: string, stageName: string) {
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, leadId), with: { stage: true } });
  if (!lead) return;
  const target = await db.query.pipelineStages.findFirst({ where: and(eq(t.pipelineStages.applicationId, lead.applicationId), ilike(t.pipelineStages.name, stageName)) });
  if (!target) return;
  if (lead.stage.order < target.order && !lead.stage.isWon && !lead.stage.isLost) {
    await db.update(t.leads).set({ stageId: target.id }).where(eq(t.leads.id, leadId));
    await addActivity(leadId, "stage_change", `Stage moved to ${target.name} automatically`);
    await queueStageWebhook(leadId);
  }
}

/**
 * If the lead came from another application and that application has a webhook URL,
 * queue a signed "lead.stage_changed" event. The worker delivers it with retries.
 */
export async function queueStageWebhook(leadId: string, actor?: string | null) {
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, leadId), with: { stage: true, application: true } });
  if (!lead?.application?.webhookUrl || !lead.externalId) return;
  await db.insert(t.webhookDeliveries).values({
    applicationId: lead.applicationId,
    event: "lead.stage_changed",
    body: {
      event: "lead.stage_changed", application: lead.application.key, externalId: lead.externalId, leadId: lead.id,
      stage: lead.stage.name, isWon: lead.stage.isWon, isLost: lead.stage.isLost, priority: lead.priority,
      actor: actor ?? null, at: new Date().toISOString(),
    },
  });
}

export function webhookSecret(app: { webhookSecretEnc: string | null }) {
  return app.webhookSecretEnc ? decrypt(app.webhookSecretEnc) : null;
}
