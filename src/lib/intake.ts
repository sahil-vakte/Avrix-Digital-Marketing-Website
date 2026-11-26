// Intake: turns a lead posted by another application into a lead in this CRM.
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db";
import type { Application, Lead } from "@/db/schema";
import { addActivity, queueStageWebhook, stageByName } from "./crm";
import { queueEmail } from "./outbox";
import { env } from "./env";
import { normaliseEmail, isValidSyntax } from "./email-validate";
import { normaliseCountry } from "./countries";
import { hashKey } from "./signing";
import { escapeHtml } from "./merge";

const SOURCES = ["WEBSITE_FORM", "BOOKING", "CAMPAIGN_REPLY", "MANUAL", "WHATSAPP", "PHONE", "OTHER",
  "WEBHOOK", "FACEBOOK_LEAD_AD", "CHATBOT", "NEWSLETTER", "JOB_APPLICATION", "SYNC"] as const;
type Source = (typeof SOURCES)[number];

const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const str = (max: number) => z.string().trim().max(max).optional().nullable();

export const IntakeLead = z.object({
  externalId: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
  externalUrl: z.string().url().max(500).optional().nullable(),
  name: str(160), firstName: str(80), lastName: str(80),
  email: str(254), phone: str(40),
  businessName: str(200), country: str(60),
  service: str(200), budget: str(120), message: str(10_000),
  stage: str(80),
  source: z.string().trim().max(40).optional().nullable(),
  priority: z.enum(["low", "normal", "high"]).optional().nullable(),
  value: z.union([z.number(), z.string()]).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
  attribution: z.record(z.string(), scalar).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  consent: z.object({ marketing: z.boolean().optional(), text: z.string().max(1000).optional(), at: z.string().optional() }).optional(),
  attachments: z.array(z.object({ name: z.string().max(200), size: z.number().optional(), type: z.string().max(100).optional(), ref: z.string().max(500).optional() })).max(30).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional().nullable(),
  note: str(5000),
});
export type IntakeLeadInput = z.infer<typeof IntakeLead>;

export const IntakeStatus = z.object({
  externalId: z.union([z.string(), z.number()]).transform(String),
  stage: str(80), priority: z.enum(["low", "normal", "high"]).optional().nullable(), note: str(5000),
});

export type IntakeResult = { leadId: string; outcome: "created" | "updated" | "merged" | "duplicate" };

export async function applicationForKey(key: string) {
  const row = await db.query.applicationKeys.findFirst({
    where: and(eq(t.applicationKeys.keyHash, hashKey(key)), isNull(t.applicationKeys.revokedAt)),
    with: { application: true },
  });
  if (!row || !row.application.active) return null;
  await db.update(t.applicationKeys).set({ lastUsedAt: new Date() }).where(eq(t.applicationKeys.id, row.id));
  return { key: row, app: row.application };
}

function toSource(s: string | null | undefined): Source {
  const up = (s ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  return (SOURCES as readonly string[]).includes(up) ? (up as Source) : "WEBHOOK";
}

const clean = (o: Record<string, unknown> | undefined) =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== ""));

/** Values from the source fill gaps; values someone typed in the CRM are never overwritten. */
function fillGaps(lead: Lead, p: IntakeLeadInput, email: string, name: string) {
  const patch: Partial<Lead> = {};
  const set = <K extends keyof Lead>(k: K, v: Lead[K] | null | undefined) => { if (v && !lead[k]) patch[k] = v as Lead[K]; };
  set("email", email); set("phone", p.phone); set("businessName", p.businessName); set("service", p.service);
  set("budget", p.budget); set("country", p.country ? normaliseCountry(p.country) : null); set("externalUrl", p.externalUrl);
  if (!lead.externalId && p.externalId) patch.externalId = p.externalId;
  if (lead.name === lead.email && name) patch.name = name;
  patch.customFields = { ...(lead.customFields ?? {}), ...clean(p.customFields) };
  if (p.tags?.length) patch.tags = [...new Set([...(lead.tags ?? []), ...p.tags])];
  return patch;
}

/** Create or update a lead for `app`. Idempotent per (application, idempotencyKey). */
export async function processIntake(app: Application, p: IntakeLeadInput, idempotencyKey: string | null): Promise<IntakeResult> {
  if (idempotencyKey) {
    const seen = await db.query.intakeEvents.findFirst({ where: and(eq(t.intakeEvents.applicationId, app.id), eq(t.intakeEvents.idempotencyKey, idempotencyKey)) });
    if (seen?.leadId) return { leadId: seen.leadId, outcome: "duplicate" };
  }
  const email = p.email ? normaliseEmail(p.email) : "";
  if (email && !isValidSyntax(email)) throw new IntakeError("email is not a valid address");
  if (!email && !p.phone) throw new IntakeError("A lead needs an email address or a phone number");
  const name = p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || email || p.phone || "Unknown";
  const utm = Object.fromEntries(Object.entries(clean(p.attribution)).map(([k, v]) => [k, String(v)]));

  // 1) Same record from the source app → update.  2) Same person in this application → merge.
  let existing: Lead | undefined;
  if (p.externalId) existing = await db.query.leads.findFirst({ where: and(eq(t.leads.applicationId, app.id), eq(t.leads.externalId, p.externalId)) });
  const sameRecord = !!existing;
  if (!existing && email) existing = await db.query.leads.findFirst({ where: and(eq(t.leads.applicationId, app.id), ilike(t.leads.email, email)) });
  if (!existing && !email && p.phone) existing = await db.query.leads.findFirst({ where: and(eq(t.leads.applicationId, app.id), eq(t.leads.phone, p.phone)) });

  let result: IntakeResult;
  const meta = { service: p.service, budget: p.budget, attribution: utm, customFields: clean(p.customFields), attachments: p.attachments, externalId: p.externalId };
  // Health data: keep the message on the lead record only, never copied into activity metadata or alerts.
  const health = app.dataClass === "HEALTH";

  if (existing) {
    const patch = fillGaps(existing, p, email, name);
    if (p.priority) patch.priority = p.priority;
    if (!sameRecord && p.message) patch.message = existing.message ? `${existing.message}\n\n— ${new Date().toISOString().slice(0, 10)} —\n${p.message}` : p.message;
    await db.update(t.leads).set(patch).where(eq(t.leads.id, existing.id));
    await addActivity(existing.id, "form", sameRecord ? `Updated from ${app.name}` : `New enquiry from ${app.name} (existing lead)`,
      health ? { externalId: p.externalId, attachments: p.attachments?.map((a) => a.name) } : { ...meta, message: p.message });
    if (p.stage) await applyStage(existing.id, app.id, p.stage, `Stage updated by ${app.name}`);
    result = { leadId: existing.id, outcome: sameRecord ? "updated" : "merged" };
  } else {
    const stage = await stageByName(app.id, p.stage ?? "");
    let contactId: string | null = null;
    // Only business applications feed the marketing contact list. Health and recruitment leads never enter campaigns.
    if (app.dataClass === "BUSINESS" && email) contactId = await ensureContact(app, p, email);
    const [lead] = await db.insert(t.leads).values({
      applicationId: app.id, externalId: p.externalId ?? null, externalUrl: p.externalUrl ?? null,
      name, email, phone: p.phone ?? null, businessName: p.businessName ?? null,
      country: p.country ? normaliseCountry(p.country) : null, service: p.service ?? null, budget: p.budget ?? null,
      message: p.message ?? null, source: toSource(p.source), stageId: stage.id, utm: Object.keys(utm).length ? utm : null,
      customFields: clean(p.customFields), priority: p.priority ?? "normal", tags: p.tags ?? [], contactId,
      value: p.value != null && p.value !== "" ? String(p.value) : null, currency: p.currency?.toUpperCase() ?? "GBP",
      ...(p.occurredAt ? { createdAt: new Date(p.occurredAt) } : {}),
    }).returning();
    await addActivity(lead.id, "form", `Received from ${app.name}`, health ? { externalId: p.externalId, attachments: p.attachments?.map((a) => a.name) } : { ...meta, message: p.message });
    await alertNewLead(app, lead);
    result = { leadId: lead.id, outcome: "created" };
  }
  if (p.note) await db.insert(t.notes).values({ leadId: result.leadId, body: `${app.name}: ${p.note}` });
  if (idempotencyKey)
    await db.insert(t.intakeEvents).values({ applicationId: app.id, idempotencyKey, leadId: result.leadId, outcome: result.outcome }).onConflictDoNothing();
  return result;
}

/** Status update from the source application (e.g. a clinic marks an enquiry as booked). */
export async function processStatus(app: Application, p: z.infer<typeof IntakeStatus>) {
  const lead = await db.query.leads.findFirst({ where: and(eq(t.leads.applicationId, app.id), eq(t.leads.externalId, p.externalId)) });
  if (!lead) throw new IntakeError("No lead with that externalId for this application", 404);
  if (p.priority) await db.update(t.leads).set({ priority: p.priority }).where(eq(t.leads.id, lead.id));
  if (p.stage) await applyStage(lead.id, app.id, p.stage, `Stage updated by ${app.name}`, false);
  if (p.note) await db.insert(t.notes).values({ leadId: lead.id, body: `${app.name}: ${p.note}` });
  return { leadId: lead.id };
}

async function applyStage(leadId: string, applicationId: string, stageName: string, summary: string, notify = true) {
  const stage = await db.query.pipelineStages.findFirst({ where: and(eq(t.pipelineStages.applicationId, applicationId), ilike(t.pipelineStages.name, stageName)) });
  if (!stage) return;
  const [moved] = await db.update(t.leads).set({ stageId: stage.id }).where(eq(t.leads.id, leadId)).returning({ id: t.leads.id });
  if (moved) {
    await addActivity(leadId, "stage_change", `${summary}: ${stage.name}`);
    if (notify) await queueStageWebhook(leadId, "source");
  }
}

async function ensureContact(app: Application, p: IntakeLeadInput, email: string) {
  const found = await db.query.contacts.findFirst({ where: eq(t.contacts.email, email) });
  const optedIn = p.consent?.marketing === true;
  if (found) {
    if (optedIn && found.consentStatus !== "OPTED_IN" && found.applicationId === app.id)
      await db.update(t.contacts).set({ consentStatus: "OPTED_IN", consentAt: new Date(), lawfulBasis: `Consent (${app.name})` }).where(eq(t.contacts.id, found.id));
    return found.id;
  }
  const [first, ...rest] = (p.firstName ? [p.firstName, p.lastName ?? ""] : (p.name ?? "").split(/\s+/));
  const [c] = await db.insert(t.contacts).values({
    applicationId: app.id, email, businessName: p.businessName || "—", firstName: first || null, lastName: rest.join(" ").trim() || null,
    phone: p.phone ?? null, country: p.country ? normaliseCountry(p.country) : "GB", source: `${app.name} (intake API)`,
    consentStatus: optedIn ? "OPTED_IN" : "NONE", consentAt: optedIn ? new Date(p.consent?.at ?? Date.now()) : null,
    lawfulBasis: optedIn ? `Consent (${app.name})${p.consent?.text ? `: ${p.consent.text.slice(0, 200)}` : ""}` : null,
  }).onConflictDoNothing().returning();
  return c?.id ?? (await db.query.contacts.findFirst({ where: eq(t.contacts.email, email) }))?.id ?? null;
}

async function alertNewLead(app: Application, lead: Lead) {
  const to = app.alertEmail || env.adminAlertEmail;
  if (!to) return;
  const link = `${env.appUrl}/admin/leads/${lead.id}`;
  // Health applications: no personal details in the email, only a link behind the CRM login.
  const html = app.dataClass === "HEALTH"
    ? `<p>A new enquiry has arrived for <b>${escapeHtml(app.name)}</b>.</p><p><a href="${link}">Open it in the CRM</a> (sign-in required).</p>`
    : `<p><b>${escapeHtml(lead.name)}</b>${lead.businessName ? ` from <b>${escapeHtml(lead.businessName)}</b>` : ""} via ${escapeHtml(app.name)}</p>
<p>Email: ${escapeHtml(lead.email || "—")}<br>Phone: ${escapeHtml(lead.phone || "—")}<br>Service: ${escapeHtml(lead.service || "—")}</p>
${lead.message ? `<blockquote style="border-left:3px solid #ddd;padding-left:10px">${escapeHtml(lead.message.slice(0, 2000)).replace(/\n/g, "<br>")}</blockquote>` : ""}
<p><a href="${link}">Open in CRM</a></p>`;
  const subject = app.dataClass === "HEALTH" ? `[${app.name}] New enquiry` : `[${app.name}] New lead: ${lead.name}`;
  await queueEmail({ to, subject, html, applicationId: app.id });
}

export class IntakeError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
