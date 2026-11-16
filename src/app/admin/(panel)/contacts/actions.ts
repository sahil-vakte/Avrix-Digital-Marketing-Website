"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { db, t } from "@/db";
import type { Contact } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkEmail, normaliseEmail } from "@/lib/email-validate";
import { parseUpload, autoMap } from "@/lib/import-parse";
import { commitImport, type ImportOptions } from "@/lib/import-commit";
import { str, strOrNull } from "@/lib/utils";

function fields(fd: FormData) {
  const custom: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("cf_key_")) {
    const i = k.slice(7); const val = str(fd.get(`cf_val_${i}`)); if (str(v)) custom[str(v)] = val;
  }
  const consent = str(fd.get("consentStatus")) as Contact["consentStatus"];
  return {
    businessName: str(fd.get("businessName")), firstName: strOrNull(fd.get("firstName")), lastName: strOrNull(fd.get("lastName")),
    jobTitle: strOrNull(fd.get("jobTitle")), phone: strOrNull(fd.get("phone")), website: strOrNull(fd.get("website")), city: strOrNull(fd.get("city")),
    country: str(fd.get("country")) || "GB", businessType: (str(fd.get("businessType")) || "UNKNOWN") as Contact["businessType"],
    consentStatus: consent || "NONE", lawfulBasis: strOrNull(fd.get("lawfulBasis")), source: str(fd.get("source")) || "Manual entry",
    tags: str(fd.get("tags")).split(",").map((s) => s.trim()).filter(Boolean), customFields: custom,
  };
}

export async function createContact(fd: FormData) {
  const user = await requireUser();
  const email = normaliseEmail(str(fd.get("email")));
  const f = fields(fd);
  const chk = await checkEmail(email);
  if (chk.status === "INVALID") redirect(`/admin/contacts/new?error=${encodeURIComponent(chk.reason ?? "Invalid email")}`);
  if (!f.businessName) redirect("/admin/contacts/new?error=Business+name+is+required");
  const exists = await db.query.contacts.findFirst({ where: eq(t.contacts.email, email) });
  if (exists) redirect(`/admin/contacts/${exists.id}?error=A+contact+with+this+email+already+exists`);
  const [c] = await db.insert(t.contacts).values({ ...f, email, emailStatus: chk.status, emailFlags: chk.flags, consentAt: f.consentStatus === "OPTED_IN" ? new Date() : null }).returning();
  const listId = strOrNull(fd.get("listId"));
  if (listId) await db.insert(t.listMembers).values({ listId, contactId: c.id }).onConflictDoNothing();
  await audit(user.id, "create", "contact", c.id, { email });
  redirect(`/admin/contacts/${c.id}?ok=Contact+created`);
}

export async function quickAddContacts(fd: FormData) {
  // Paste box: one contact per line → "email, business, first name, last name"
  const user = await requireUser();
  const lines = str(fd.get("bulk")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((l) => l.split(/[,;\t]/).map((s) => s.trim()));
  const [job] = await db.insert(t.importJobs).values({ fileName: "Pasted list", fileType: "paste", headers: ["Email", "Business name", "First name", "Last name"], rows, total: rows.length, createdById: user.id }).returning();
  const o: ImportOptions = {
    mapping: { "0": "email", "1": "businessName", "2": "firstName", "3": "lastName" },
    defaults: { country: str(fd.get("country")) || "GB", businessType: str(fd.get("businessType")) || "UNKNOWN", consentStatus: str(fd.get("consentStatus")) || "NONE", source: str(fd.get("source")) || "Manual paste", tags: "" },
    duplicateMode: "skip", checkMx: true, listId: strOrNull(fd.get("listId")),
  };
  const r = await commitImport(job.id, rows, job.headers, o);
  await audit(user.id, "import", "contacts", job.id, r);
  redirect(`/admin/contacts/import/${job.id}`);
}

export async function updateContact(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const f = fields(fd);
  const before = await db.query.contacts.findFirst({ where: eq(t.contacts.id, id) });
  if (!before) return;
  await db.update(t.contacts).set({ ...f, consentAt: f.consentStatus === "OPTED_IN" && before.consentStatus !== "OPTED_IN" ? new Date() : before.consentAt }).where(eq(t.contacts.id, id));
  await audit(user.id, "update", "contact", id, f);
  redirect(`/admin/contacts/${id}?ok=Saved`);
}

export async function setMembership(fd: FormData) {
  await requireUser();
  const contactId = str(fd.get("contactId"));
  const listId = str(fd.get("listId"));
  if (fd.get("op") === "remove") await db.delete(t.listMembers).where(sql`${t.listMembers.listId} = ${listId} and ${t.listMembers.contactId} = ${contactId}`);
  else await db.insert(t.listMembers).values({ listId, contactId }).onConflictDoNothing();
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function eraseContact(fd: FormData) {
  // GDPR erasure: delete personal data, keep the address on the suppression list so it is never re-imported/emailed.
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const c = await db.query.contacts.findFirst({ where: eq(t.contacts.id, id) });
  if (!c) return;
  await db.transaction(async (tx) => {
    await tx.insert(t.suppressions).values({ email: c.email, reason: "ERASED", note: "Erasure request" }).onConflictDoUpdate({ target: t.suppressions.email, set: { reason: "ERASED" } });
    await tx.update(t.campaignRecipients).set({ replySnippet: null }).where(eq(t.campaignRecipients.email, c.email));
    await tx.delete(t.leads).where(eq(t.leads.email, c.email));
    await tx.delete(t.contacts).where(eq(t.contacts.id, id));
  });
  await audit(user.id, "erase", "contact", id, { emailDomain: c.email.split("@")[1] });
  redirect("/admin/contacts?ok=Contact+erased+and+suppressed");
}

export async function bulkContacts(fd: FormData) {
  const user = await requireUser();
  const ids = fd.getAll("ids").map(String);
  const op = str(fd.get("op"));
  if (!ids.length) redirect("/admin/contacts?error=Select+at+least+one+contact");
  if (op === "list") {
    const listId = str(fd.get("listId"));
    if (listId) await db.insert(t.listMembers).values(ids.map((contactId) => ({ listId, contactId }))).onConflictDoNothing();
  } else if (op === "tag") {
    const tag = str(fd.get("tag"));
    if (tag) await db.update(t.contacts).set({ tags: sql`array(select distinct unnest(${t.contacts.tags} || array[${tag}]::text[]))` }).where(inArray(t.contacts.id, ids));
  } else if (op === "type") {
    await db.update(t.contacts).set({ businessType: str(fd.get("businessType")) as Contact["businessType"] }).where(inArray(t.contacts.id, ids));
  } else if (op === "consent") {
    await db.update(t.contacts).set({ consentStatus: str(fd.get("consentStatus")) as Contact["consentStatus"] }).where(inArray(t.contacts.id, ids));
  } else if (op === "delete") {
    if (user.role !== "ADMIN") redirect("/admin/contacts?error=Only+admins+can+delete");
    await db.delete(t.contacts).where(inArray(t.contacts.id, ids));
  }
  await audit(user.id, `bulk_${op}`, "contacts", null, { count: ids.length });
  redirect(`/admin/contacts?ok=${encodeURIComponent(`Updated ${ids.length} contact(s)`)}`);
}

export async function uploadImport(fd: FormData) {
  const user = await requireUser();
  const file = fd.get("file") as File | null;
  if (!file || !file.size) redirect("/admin/contacts/import?error=Choose+a+file");
  if (file.size > 15 * 1024 * 1024) redirect("/admin/contacts/import?error=File+is+larger+than+15+MB");
  let parsed;
  try {
    parsed = await parseUpload(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    redirect(`/admin/contacts/import?error=${encodeURIComponent("Could not read file: " + (e as Error).message)}`);
  }
  if (!parsed.rows.length) redirect("/admin/contacts/import?error=No+rows+found.+For+PDFs+make+sure+the+text+is+selectable+(not+a+scanned+image).");
  if (parsed.rows.length > 50_000) redirect("/admin/contacts/import?error=Maximum+50%2C000+rows+per+import");
  const [job] = await db.insert(t.importJobs).values({
    fileName: file.name, fileType: parsed.kind, headers: parsed.headers, rows: parsed.rows, total: parsed.rows.length,
    mapping: autoMap(parsed.headers), status: "UPLOADED", createdById: user.id,
  }).returning();
  await audit(user.id, "upload", "import", job.id, { file: file.name, rows: parsed.rows.length });
  redirect(`/admin/contacts/import/${job.id}`);
}

export async function runImport(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("jobId"));
  const job = await db.query.importJobs.findFirst({ where: eq(t.importJobs.id, id) });
  if (!job || job.status === "COMPLETED") redirect(`/admin/contacts/import/${id}`);
  const mapping = JSON.parse(str(fd.get("mapping")) || "{}") as Record<string, string>;
  if (!Object.values(mapping).includes("email")) redirect(`/admin/contacts/import/${id}?error=Map+a+column+to+Email`);
  const edited = str(fd.get("rows"));
  const rows = edited ? (JSON.parse(edited) as string[][]) : job.rows;
  let listId = strOrNull(fd.get("listId"));
  const newList = str(fd.get("newListName"));
  if (newList) [{ id: listId }] = await db.insert(t.lists).values({ name: newList, type: "STATIC", description: `Imported from ${job.fileName}` }).returning({ id: t.lists.id });
  const templateName = str(fd.get("saveMappingAs"));
  if (templateName) {
    const byHeader: Record<string, string> = {};
    job.headers.forEach((h, i) => { if (mapping[String(i)]) byHeader[h] = mapping[String(i)]; });
    await db.insert(t.importMappings).values({ name: templateName, mapping: byHeader }).onConflictDoUpdate({ target: t.importMappings.name, set: { mapping: byHeader } });
  }
  await db.update(t.importJobs).set({ status: "PROCESSING" }).where(eq(t.importJobs.id, id));
  try {
    const r = await commitImport(id, rows, job.headers, {
      mapping, listId, duplicateMode: fd.get("duplicateMode") === "update" ? "update" : "skip", checkMx: fd.get("checkMx") === "on",
      defaults: { country: str(fd.get("country")) || "GB", businessType: str(fd.get("businessType")) || "UNKNOWN", consentStatus: str(fd.get("consentStatus")) || "NONE", source: str(fd.get("source")) || `Import: ${job.fileName}`, tags: str(fd.get("tags")) },
    });
    await audit(user.id, "import", "contacts", id, r);
  } catch (e) {
    await db.update(t.importJobs).set({ status: "FAILED", errors: [{ row: 0, email: "", reason: (e as Error).message }] }).where(eq(t.importJobs.id, id));
  }
  redirect(`/admin/contacts/import/${id}`);
}
