"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { addActivity, queueStageWebhook } from "@/lib/crm";
import { canSeeApplication, leadForUser } from "@/lib/apps";
import { queueEmail } from "@/lib/outbox";
import { setSetting, getRaw } from "@/lib/settings";
import { normaliseEmail, isValidSyntax } from "@/lib/email-validate";
import { str, strOrNull } from "@/lib/utils";
import { applyMerge } from "@/lib/merge";

function leadFields(fd: FormData) {
  return {
    name: str(fd.get("name")), businessName: strOrNull(fd.get("businessName")), email: normaliseEmail(str(fd.get("email"))),
    phone: strOrNull(fd.get("phone")), country: strOrNull(fd.get("country")), service: strOrNull(fd.get("service")),
    budget: strOrNull(fd.get("budget")), value: strOrNull(fd.get("value")), currency: str(fd.get("currency")) || "GBP",
    ownerId: strOrNull(fd.get("ownerId")), tags: str(fd.get("tags")).split(",").map((s) => s.trim()).filter(Boolean),
    priority: ["low", "normal", "high"].includes(str(fd.get("priority"))) ? str(fd.get("priority")) : "normal",
  };
}

export async function createLead(fd: FormData) {
  const user = await requireUser();
  const f = leadFields(fd);
  if (!f.name || !isValidSyntax(f.email)) redirect("/admin/leads/new?error=Name+and+a+valid+email+are+required");
  const stageId = str(fd.get("stageId"));
  const stage = await db.query.pipelineStages.findFirst({ where: eq(t.pipelineStages.id, stageId) });
  if (!stage || !(await canSeeApplication(user, stage.applicationId))) redirect("/admin/leads/new?error=Choose+a+stage+in+an+application+you+can+access");
  const existingContact = await db.query.contacts.findFirst({ where: eq(t.contacts.email, f.email) });
  const [lead] = await db.insert(t.leads).values({ ...f, stageId, applicationId: stage.applicationId, source: (str(fd.get("source")) || "MANUAL") as "MANUAL", message: strOrNull(fd.get("message")), contactId: existingContact?.id ?? null }).returning();
  await addActivity(lead.id, "created", `Lead added manually by ${user.name}`);
  await audit(user.id, "create", "lead", lead.id, f, await clientIp());
  redirect(`/admin/leads/${lead.id}`);
}

export async function updateLead(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const f = leadFields(fd);
  const before = await leadForUser(user, id);
  await db.update(t.leads).set(f).where(eq(t.leads.id, id));
  if (before.ownerId !== f.ownerId) await addActivity(id, "owner_change", `Owner changed by ${user.name}`);
  await audit(user.id, "update", "lead", id, f);
  revalidatePath(`/admin/leads/${id}`);
}

export async function moveLead(leadId: string, stageId: string) {
  const user = await requireUser();
  const lead = await leadForUser(user, leadId);
  const stage = await db.query.pipelineStages.findFirst({ where: and(eq(t.pipelineStages.id, stageId), eq(t.pipelineStages.applicationId, lead.applicationId)) });
  if (!stage || lead.stageId === stageId) return;
  await db.update(t.leads).set({ stageId }).where(eq(t.leads.id, leadId));
  await addActivity(leadId, "stage_change", `Moved to ${stage.name} by ${user.name}`);
  await queueStageWebhook(leadId, user.name);
  await audit(user.id, "stage_change", "lead", leadId, { to: stage.name });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function setStage(fd: FormData) {
  await moveLead(str(fd.get("id")), str(fd.get("stageId")));
}

export async function addNote(fd: FormData) {
  const user = await requireUser();
  const leadId = str(fd.get("leadId"));
  await leadForUser(user, leadId);
  const body = str(fd.get("body"));
  if (!body) return;
  await db.insert(t.notes).values({ leadId, body, authorId: user.id });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function addTask(fd: FormData) {
  const user = await requireUser();
  const leadId = str(fd.get("leadId"));
  await leadForUser(user, leadId);
  const title = str(fd.get("title"));
  if (!title) return;
  const due = str(fd.get("dueAt"));
  await db.insert(t.tasks).values({ leadId, title, dueAt: due ? new Date(due) : null, assigneeId: strOrNull(fd.get("assigneeId")) });
  await addActivity(leadId, "task", `Task added: ${title}`);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function toggleTask(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const task = await db.query.tasks.findFirst({ where: eq(t.tasks.id, id) });
  if (!task) return;
  if (task.leadId) await leadForUser(user, task.leadId);
  await db.update(t.tasks).set({ done: !task.done }).where(eq(t.tasks.id, id));
  if (task.leadId) revalidatePath(`/admin/leads/${task.leadId}`);
  revalidatePath("/admin");
}

export async function sendLeadEmail(fd: FormData) {
  const user = await requireUser();
  const leadId = str(fd.get("leadId"));
  const lead = await leadForUser(user, leadId);
  if (!lead.email) redirect(`/admin/leads/${leadId}?error=This+lead+has+no+email+address`);
  const subject = str(fd.get("subject"));
  const html = String(fd.get("html") ?? "");
  if (!lead || !subject || !html.replace(/<[^>]+>/g, "").trim()) redirect(`/admin/leads/${leadId}?error=Subject+and+message+are+required`);
  const sup = await db.query.suppressions.findFirst({ where: eq(t.suppressions.email, lead.email) });
  if (sup) redirect(`/admin/leads/${leadId}?error=This+address+is+on+the+suppression+list+(${sup.reason.toLowerCase()})`);
  const [first, ...rest] = lead.name.split(/\s+/);
  const data = { first_name: first, last_name: rest.join(" "), full_name: lead.name, business_name: lead.businessName, email: lead.email };
  await queueEmail({ to: lead.email, subject: applyMerge(subject, data), html: applyMerge(html, data, true), kind: "ONE_TO_ONE", leadId, applicationId: lead.applicationId });
  await addActivity(leadId, "email_queued", `Email “${subject}” queued by ${user.name}`);
  await audit(user.id, "send_email", "lead", leadId, { subject });
  redirect(`/admin/leads/${leadId}?ok=Email+queued.+It+will+be+sent+within+a+minute`);
}

export async function deleteLead(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  await leadForUser(user, id);
  await db.delete(t.leads).where(eq(t.leads.id, id));
  await audit(user.id, "delete", "lead", id);
  redirect("/admin/leads");
}

export async function mergeLeads(fd: FormData) {
  const user = await requireUser();
  const keepId = str(fd.get("keepId"));
  const dropId = str(fd.get("dropId"));
  if (!keepId || !dropId || keepId === dropId) return;
  const [keep, drop] = await Promise.all([leadForUser(user, keepId), leadForUser(user, dropId)]);
  if (keep.applicationId !== drop.applicationId) redirect(`/admin/leads/${keepId}?error=Leads+from+different+applications+cannot+be+merged`);
  await db.transaction(async (tx) => {
    for (const table of [t.notes, t.tasks, t.activities, t.bookings] as const)
      await tx.update(table).set({ leadId: keepId } as never).where(eq(table.leadId, dropId));
    await tx.update(t.emailMessages).set({ leadId: keepId }).where(eq(t.emailMessages.leadId, dropId));
    await tx.delete(t.leads).where(eq(t.leads.id, dropId));
  });
  await addActivity(keepId, "merge", `Merged a duplicate lead (by ${user.name})`);
  await audit(user.id, "merge", "lead", keepId, { merged: dropId });
  redirect(`/admin/leads/${keepId}?ok=Leads+merged`);
}

export async function saveView(fd: FormData) {
  const user = await requireUser();
  const name = str(fd.get("name"));
  const query = str(fd.get("query"));
  if (!name) return;
  const key = `views.leads.${user.id}`;
  const views = (await getRaw<{ name: string; query: string }[]>(key)) ?? [];
  await setSetting(key, [...views.filter((v) => v.name !== name), { name, query }]);
  revalidatePath("/admin/leads");
}

export async function deleteView(fd: FormData) {
  const user = await requireUser();
  const key = `views.leads.${user.id}`;
  const views = (await getRaw<{ name: string; query: string }[]>(key)) ?? [];
  await setSetting(key, views.filter((v) => v.name !== str(fd.get("name"))));
  revalidatePath("/admin/leads");
}

export async function bulkMove(fd: FormData) {
  const user = await requireUser();
  const ids = fd.getAll("ids").map(String);
  const stageId = str(fd.get("stageId"));
  if (!ids.length || !stageId) return;
  const stage = await db.query.pipelineStages.findFirst({ where: eq(t.pipelineStages.id, stageId) });
  if (!stage || !(await canSeeApplication(user, stage.applicationId))) return;
  // Only leads in the stage's own application can move to it.
  const moved = await db.update(t.leads).set({ stageId })
    .where(and(inArray(t.leads.id, ids), ne(t.leads.stageId, stageId), eq(t.leads.applicationId, stage.applicationId))).returning({ id: t.leads.id });
  for (const m of moved) { await addActivity(m.id, "stage_change", `Moved to ${stage.name} by ${user.name} (bulk)`); await queueStageWebhook(m.id, user.name); }
  if (moved.length < ids.length) redirect(`/admin/leads?view=table&error=${encodeURIComponent(`${moved.length} moved. Leads from other applications were skipped because “${stage.name}” belongs to a different pipeline.`)}`);
  revalidatePath("/admin/leads");
}
