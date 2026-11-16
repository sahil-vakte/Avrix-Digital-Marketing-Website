"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { materializeCampaign } from "@/lib/audience";
import { renderEmail } from "@/lib/email-render";
import { contactMergeData } from "@/lib/merge";
import { newMessageId, sendMail } from "@/lib/mailer";
import { randomToken } from "@/lib/crypto";
import { normaliseEmail, isValidSyntax } from "@/lib/email-validate";
import { zonedToUtc } from "@/lib/time";
import { env } from "@/lib/env";
import { str } from "@/lib/utils";

const back = (id: string, anchor = "", q = "") => redirect(`/admin/campaigns/${id}${q ? `?${q}` : ""}${anchor ? `#${anchor}` : ""}`);

async function editable(id: string) {
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id) });
  if (!c) redirect("/admin/campaigns");
  if (!["DRAFT", "PENDING_APPROVAL"].includes(c.status)) back(id, "", "error=Campaign+is+already+launched");
  return c;
}

export async function createCampaign(fd: FormData) {
  const user = await requireUser();
  const tplId = str(fd.get("templateId"));
  const tpl = tplId ? await db.query.templates.findFirst({ where: eq(t.templates.id, tplId) }) : null;
  const listIds = fd.getAll("listIds").map(String).filter(Boolean);
  const [c] = await db.insert(t.campaigns).values({
    name: str(fd.get("name")) || "Untitled campaign", fromName: env.mail.fromName, replyTo: env.mail.replyTo || null,
    subjectA: tpl?.subject ?? "", html: tpl?.html ?? "", listIds, createdById: user.id,
  }).returning();
  await audit(user.id, "create", "campaign", c.id);
  redirect(`/admin/campaigns/${c.id}`);
}

export async function saveDetails(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  await db.update(t.campaigns).set({ name: str(fd.get("name")), fromName: str(fd.get("fromName")) || env.mail.fromName, replyTo: str(fd.get("replyTo")) || null }).where(eq(t.campaigns.id, id));
  back(id, "details", "ok=Details+saved");
}

export async function saveAudience(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  await db.update(t.campaigns).set({ listIds: fd.getAll("listIds").map(String) }).where(eq(t.campaigns.id, id));
  back(id, "audience", "ok=Audience+saved");
}

export async function saveContent(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  const subjectB = str(fd.get("subjectB"));
  await db.update(t.campaigns).set({
    subjectA: str(fd.get("subjectA")), subjectB: subjectB || null, html: String(fd.get("html") ?? ""),
    abTestPercent: Math.min(50, Math.max(10, Number(fd.get("abTestPercent") || 20))), abWinnerMetric: fd.get("abWinnerMetric") === "reply" ? "reply" : "open",
    abWaitHours: Math.min(72, Math.max(1, Number(fd.get("abWaitHours") || 4))),
  }).where(eq(t.campaigns.id, id));
  if (fd.get("saveAsTemplate") === "on")
    await db.insert(t.templates).values({ name: `${str(fd.get("campaignName"))} (from campaign)`, subject: str(fd.get("subjectA")), html: String(fd.get("html") ?? "") });
  back(id, "content", "ok=Content+saved");
}

export async function addStep(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  const steps = await db.select().from(t.sequenceSteps).where(eq(t.sequenceSteps.campaignId, id));
  if (steps.length >= 3) back(id, "followups", "error=Up+to+3+follow-ups");
  const order = steps.length + 1;
  await db.insert(t.sequenceSteps).values({ campaignId: id, order, delayDays: order === 1 ? 3 : order === 2 ? 4 : 7, subject: "", html: "<p>Hi {{first_name|there}},</p><p>Just bringing this back to the top of your inbox — would a quick call be useful?</p><p>Best regards,<br>AB</p>" });
  back(id, "followups");
}

export async function saveStep(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  await db.update(t.sequenceSteps).set({ delayDays: Math.max(1, Number(fd.get("delayDays") || 3)), subject: str(fd.get("subject")) || null, html: String(fd.get("html") ?? "") })
    .where(eq(t.sequenceSteps.id, str(fd.get("stepId"))));
  back(id, "followups", "ok=Follow-up+saved");
}

export async function deleteStep(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  await db.delete(t.sequenceSteps).where(eq(t.sequenceSteps.id, str(fd.get("stepId"))));
  const rest = await db.select().from(t.sequenceSteps).where(eq(t.sequenceSteps.campaignId, id)).orderBy(t.sequenceSteps.order);
  for (let i = 0; i < rest.length; i++) await db.update(t.sequenceSteps).set({ order: 100 + i }).where(eq(t.sequenceSteps.id, rest[i].id));
  for (let i = 0; i < rest.length; i++) await db.update(t.sequenceSteps).set({ order: i + 1 }).where(eq(t.sequenceSteps.id, rest[i].id));
  back(id, "followups");
}

export async function saveSchedule(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  await editable(id);
  const when = str(fd.get("when"));
  let scheduledAt: Date | null = null;
  if (fd.get("mode") === "later" && when) {
    const [d, tm] = when.split("T");
    const [h, m] = tm.split(":").map(Number);
    scheduledAt = zonedToUtc(d, h, m, "Europe/London");
  }
  const days = fd.getAll("sendDays").map(Number).filter((n) => n >= 1 && n <= 7);
  const start = Number(fd.get("sendStartHour") ?? 9), end = Number(fd.get("sendEndHour") ?? 17);
  await db.update(t.campaigns).set({
    scheduledAt, sendDays: days.length ? days : [1, 2, 3, 4, 5], sendStartHour: start, sendEndHour: end > start ? end : start + 1,
    useRecipientTz: fd.get("useRecipientTz") === "on", trackOpens: fd.get("trackOpens") === "on", trackClicks: fd.get("trackClicks") === "on",
  }).where(eq(t.campaigns.id, id));
  back(id, "schedule", "ok=Schedule+saved");
}

export async function sendTest(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const to = normaliseEmail(str(fd.get("to")) || user.email);
  if (!isValidSyntax(to)) back(id, "content", "error=Enter+a+valid+test+address");
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id), with: { steps: true } });
  if (!c) redirect("/admin/campaigns");
  const stepOrder = Number(fd.get("step") ?? 0);
  const step = stepOrder ? c.steps.find((s) => s.order === stepOrder) : null;
  const contactId = str(fd.get("contactId"));
  const contact = contactId ? await db.query.contacts.findFirst({ where: eq(t.contacts.id, contactId) }) : null;
  const data = contact ? contactMergeData(contact) : { first_name: "Jane", last_name: "Smith", business_name: "Example Ltd", city: "Leicester", email: to };
  const token = randomToken();
  const subject = `[TEST] ${step?.subject || (stepOrder ? `Re: ${c.subjectA}` : c.subjectA)}`;
  const r = await renderEmail({ bodyHtml: step?.html ?? c.html, subject, data, token, trackOpens: false, trackClicks: false, includeUnsubscribe: true });
  try {
    const messageId = newMessageId(token);
    await sendMail({ to, subject: r.subject, html: r.html, text: r.text, fromName: c.fromName, replyTo: c.replyTo, messageId, headers: r.headers });
    await db.insert(t.emailMessages).values({ kind: "TEST", campaignId: id, toEmail: to, subject: r.subject, token, status: "SENT", sentAt: new Date(), messageId });
  } catch (e) {
    back(id, "content", `error=${encodeURIComponent("Test failed: " + (e as Error).message)}`);
  }
  back(id, "content", `ok=${encodeURIComponent(`Test sent to ${to}`)}`);
}

export async function launchCampaign(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const c = await editable(id);
  if (!c.subjectA.trim() || !c.html.replace(/<[^>]+>/g, "").trim()) back(id, "review", "error=Add+a+subject+and+email+content+first");
  if (!c.listIds.length) back(id, "review", "error=Choose+at+least+one+list");
  const comp = await getSetting("compliance");
  if (user.role !== "ADMIN" && comp.requireApprovalForStaff && c.status !== "PENDING_APPROVAL") {
    await db.update(t.campaigns).set({ status: "PENDING_APPROVAL" }).where(eq(t.campaigns.id, id));
    await audit(user.id, "submit_for_approval", "campaign", id);
    back(id, "review", "ok=Submitted+for+admin+approval");
  }
  if (user.role !== "ADMIN" && c.status === "PENDING_APPROVAL") back(id, "review", "error=Waiting+for+an+admin+to+approve");
  const r = await materializeCampaign(id);
  if (user.role === "ADMIN" && c.status === "PENDING_APPROVAL") await db.update(t.campaigns).set({ approvedById: user.id }).where(eq(t.campaigns.id, id));
  await audit(user.id, "launch", "campaign", id, r);
  back(id, "", `ok=${encodeURIComponent(`Launched: ${r.eligible} recipient(s) queued, ${r.excluded} excluded`)}`);
}

export async function setCampaignStatus(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const op = str(fd.get("op"));
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id) });
  if (!c) return;
  if (op === "pause" && ["SENDING", "SCHEDULED"].includes(c.status)) await db.update(t.campaigns).set({ status: "PAUSED", pauseReason: `Paused by ${user.name}` }).where(eq(t.campaigns.id, id));
  if (op === "resume" && c.status === "PAUSED") await db.update(t.campaigns).set({ status: c.scheduledAt && c.scheduledAt > new Date() ? "SCHEDULED" : "SENDING", pauseReason: null }).where(eq(t.campaigns.id, id));
  if (op === "cancel" && !["COMPLETED", "CANCELLED"].includes(c.status)) {
    await db.update(t.campaigns).set({ status: "CANCELLED", completedAt: new Date() }).where(eq(t.campaigns.id, id));
    await db.update(t.emailMessages).set({ status: "CANCELLED", lastError: "Campaign cancelled" }).where(and(eq(t.emailMessages.campaignId, id), eq(t.emailMessages.status, "QUEUED")));
    await db.update(t.campaignRecipients).set({ status: "COMPLETED" }).where(and(eq(t.campaignRecipients.campaignId, id), inArray(t.campaignRecipients.status, ["QUEUED", "HELD", "ACTIVE"])));
  }
  if (op === "reject" && c.status === "PENDING_APPROVAL" && user.role === "ADMIN") await db.update(t.campaigns).set({ status: "DRAFT" }).where(eq(t.campaigns.id, id));
  await audit(user.id, op, "campaign", id);
  revalidatePath(`/admin/campaigns/${id}`);
  revalidatePath("/admin/campaigns");
}

export async function duplicateCampaign(fd: FormData) {
  const user = await requireUser();
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, str(fd.get("id"))), with: { steps: true } });
  if (!c) return;
  const [copy] = await db.insert(t.campaigns).values({
    name: `${c.name} (copy)`, fromName: c.fromName, replyTo: c.replyTo, subjectA: c.subjectA, subjectB: c.subjectB, abTestPercent: c.abTestPercent,
    abWinnerMetric: c.abWinnerMetric, abWaitHours: c.abWaitHours, html: c.html, listIds: c.listIds, sendDays: c.sendDays, sendStartHour: c.sendStartHour,
    sendEndHour: c.sendEndHour, useRecipientTz: c.useRecipientTz, trackOpens: c.trackOpens, trackClicks: c.trackClicks, createdById: user.id,
  }).returning();
  if (c.steps.length) await db.insert(t.sequenceSteps).values(c.steps.map((s) => ({ campaignId: copy.id, order: s.order, delayDays: s.delayDays, subject: s.subject, html: s.html })));
  redirect(`/admin/campaigns/${copy.id}`);
}

export async function deleteCampaign(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id) });
  if (!c) return;
  if (!["DRAFT", "PENDING_APPROVAL", "CANCELLED", "COMPLETED"].includes(c.status)) back(id, "", "error=Pause+or+cancel+the+campaign+first");
  if (c.status !== "DRAFT" && user.role !== "ADMIN") back(id, "", "error=Only+admins+can+delete+sent+campaigns");
  await db.delete(t.campaigns).where(eq(t.campaigns.id, id));
  await audit(user.id, "delete", "campaign", id, { name: c.name });
  redirect("/admin/campaigns");
}

export async function countQueued(id: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(t.emailMessages).where(and(eq(t.emailMessages.campaignId, id), eq(t.emailMessages.status, "QUEUED")));
  return r.n;
}
