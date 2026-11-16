"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser, clientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { addActivity } from "@/lib/crm";
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
  };
}

export async function createLead(fd: FormData) {
  const user = await requireUser();
  const f = leadFields(fd);
  if (!f.name || !isValidSyntax(f.email)) redirect("/admin/leads/new?error=Name+and+a+valid+email+are+required");
  const stageId = str(fd.get("stageId"));
  const existingContact = await db.query.contacts.findFirst({ where: eq(t.contacts.email, f.email) });
  const [lead] = await db.insert(t.leads).values({ ...f, stageId, source: (str(fd.get("source")) || "MANUAL") as "MANUAL", message: strOrNull(fd.get("message")), contactId: existingContact?.id ?? null }).returning();
  await addActivity(lead.id, "created", `Lead added manually by ${user.name}`);
  await audit(user.id, "create", "lead", lead.id, f, await clientIp());
  redirect(`/admin/leads/${lead.id}`);
}

export async function updateLead(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const f = leadFields(fd);
  const before = await db.query.leads.findFirst({ where: eq(t.leads.id, id) });
  if (!before) return;
  await db.update(t.leads).set(f).where(eq(t.leads.id, id));
  if (before.ownerId !== f.ownerId) await addActivity(id, "owner_change", `Owner changed by ${user.name}`);
  await audit(user.id, "update", "lead", id, f);
  revalidatePath(`/admin/leads/${id}`);
}

export async function moveLead(leadId: string, stageId: string) {
  const user = await requireUser();
  const [lead, stage] = await Promise.all([
    db.query.leads.findFirst({ where: eq(t.leads.id, leadId) }),
    db.query.pipelineStages.findFirst({ where: eq(t.pipelineStages.id, stageId) }),
  ]);
  if (!lead || !stage || lead.stageId === stageId) return;
  await db.update(t.leads).set({ stageId }).where(eq(t.leads.id, leadId));
  await addActivity(leadId, "stage_change", `Moved to ${stage.name} by ${user.name}`);
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
  const body = str(fd.get("body"));
  if (!body) return;
  await db.insert(t.notes).values({ leadId, body, authorId: user.id });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function addTask(fd: FormData) {
  await requireUser();
  const leadId = str(fd.get("leadId"));
  const title = str(fd.get("title"));
  if (!title) return;
  const due = str(fd.get("dueAt"));
  await db.insert(t.tasks).values({ leadId, title, dueAt: due ? new Date(due) : null, assigneeId: strOrNull(fd.get("assigneeId")) });
  await addActivity(leadId, "task", `Task added: ${title}`);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function toggleTask(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  const task = await db.query.tasks.findFirst({ where: eq(t.tasks.id, id) });
  if (!task) return;
  await db.update(t.tasks).set({ done: !task.done }).where(eq(t.tasks.id, id));
  if (task.leadId) revalidatePath(`/admin/leads/${task.leadId}`);
  revalidatePath("/admin");
}

export async function sendLeadEmail(fd: FormData) {
  const user = await requireUser();
  const leadId = str(fd.get("leadId"));
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, leadId) });
  const subject = str(fd.get("subject"));
  const html = String(fd.get("html") ?? "");
  if (!lead || !subject || !html.replace(/<[^>]+>/g, "").trim()) redirect(`/admin/leads/${leadId}?error=Subject+and+message+are+required`);
  const sup = await db.query.suppressions.findFirst({ where: eq(t.suppressions.email, lead.email) });
  if (sup) redirect(`/admin/leads/${leadId}?error=This+address+is+on+the+suppression+list+(${sup.reason.toLowerCase()})`);
  const [first, ...rest] = lead.name.split(/\s+/);
  const data = { first_name: first, last_name: rest.join(" "), full_name: lead.name, business_name: lead.businessName, email: lead.email };
  await queueEmail({ to: lead.email, subject: applyMerge(subject, data), html: applyMerge(html, data, true), kind: "ONE_TO_ONE", leadId });
  await addActivity(leadId, "email_queued", `Email “${subject}” queued by ${user.name}`);
  await audit(user.id, "send_email", "lead", leadId, { subject });
  redirect(`/admin/leads/${leadId}?ok=Email+queued.+It+will+be+sent+within+a+minute`);
}

export async function deleteLead(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  await db.delete(t.leads).where(eq(t.leads.id, id));
  await audit(user.id, "delete", "lead", id);
  redirect("/admin/leads");
}

export async function mergeLeads(fd: FormData) {
  const user = await requireUser();
  const keepId = str(fd.get("keepId"));
  const dropId = str(fd.get("dropId"));
  if (!keepId || !dropId || keepId === dropId) return;
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
  const moved = await db.update(t.leads).set({ stageId }).where(and(inArray(t.leads.id, ids), ne(t.leads.stageId, stageId))).returning({ id: t.leads.id });
  for (const m of moved) await addActivity(m.id, "stage_change", `Moved to ${stage?.name} by ${user.name} (bulk)`);
  revalidatePath("/admin/leads");
}
