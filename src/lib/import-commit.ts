// Validates mapped rows and writes contacts. Used by the import wizard.
import { eq, inArray } from "drizzle-orm";
import { db, t } from "@/db";
import type { Contact } from "@/db/schema";
import { checkEmails, isValidSyntax, normaliseEmail } from "./email-validate";
import { normaliseCountry } from "./countries";
import { parseBusinessType, parseConsent } from "./import-parse";

export type ImportOptions = {
  mapping: Record<string, string>; // column index -> field key ("custom:<name>" for custom fields)
  defaults: { country: string; businessType: string; consentStatus: string; source: string; tags: string };
  duplicateMode: "skip" | "update";
  checkMx: boolean;
  listId: string | null;
};

export async function commitImport(jobId: string, rows: string[][], headers: string[], o: ImportOptions) {
  const errors: { row: number; email: string; reason: string }[] = [];
  const byEmail = new Map<string, { row: number; rec: Partial<Contact> & { email: string } }>();
  let duplicatesInFile = 0;

  rows.forEach((r, idx) => {
    const rowNo = idx + 2; // header is row 1
    const rec: Record<string, unknown> = { customFields: {} as Record<string, string> };
    for (const [col, field] of Object.entries(o.mapping)) {
      if (!field) continue;
      const v = (r[Number(col)] ?? "").trim();
      if (!v) continue;
      if (field.startsWith("custom:")) (rec.customFields as Record<string, string>)[field.slice(7) || headers[Number(col)]] = v;
      else if (field === "fullName") {
        const parts = v.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "").split(/\s+/);
        rec.firstName ??= parts[0]; rec.lastName ??= parts.slice(1).join(" ") || null;
      } else rec[field] = v;
    }
    const email = normaliseEmail(String(rec.email ?? ""));
    if (!email) { errors.push({ row: rowNo, email: "", reason: "Missing email" }); return; }
    if (!isValidSyntax(email)) { errors.push({ row: rowNo, email, reason: "Invalid email format" }); return; }
    if (byEmail.has(email)) { duplicatesInFile++; errors.push({ row: rowNo, email, reason: `Duplicate of row ${byEmail.get(email)!.row} in this file` }); return; }
    const tags = [...String(rec.tags ?? "").split(","), ...o.defaults.tags.split(",")].map((x) => x.trim()).filter(Boolean);
    byEmail.set(email, {
      row: rowNo,
      rec: {
        email,
        businessName: String(rec.businessName ?? "").trim() || email.split("@")[1].split(".")[0],
        firstName: (rec.firstName as string) ?? null, lastName: (rec.lastName as string) ?? null,
        jobTitle: (rec.jobTitle as string) ?? null, phone: (rec.phone as string) ?? null, website: (rec.website as string) ?? null,
        city: (rec.city as string) ?? null,
        country: normaliseCountry(rec.country as string | undefined, o.defaults.country || "GB"),
        businessType: ((rec.businessType && parseBusinessType(String(rec.businessType))) || parseBusinessType(String(rec.businessName ?? "")) || o.defaults.businessType || "UNKNOWN") as Contact["businessType"],
        consentStatus: ((rec.consentStatus && parseConsent(String(rec.consentStatus))) || o.defaults.consentStatus || "NONE") as Contact["consentStatus"],
        source: o.defaults.source || "Import",
        tags, customFields: rec.customFields as Record<string, string>,
      },
    });
  });

  const emails = [...byEmail.keys()];
  // Suppression list
  const suppressed = new Set<string>();
  for (let i = 0; i < emails.length; i += 1000) {
    const part = emails.slice(i, i + 1000);
    for (const s of await db.select({ email: t.suppressions.email }).from(t.suppressions).where(inArray(t.suppressions.email, part))) suppressed.add(s.email);
  }
  // Deliverability checks
  const checks = await checkEmails(emails.filter((e) => !suppressed.has(e)), 16).catch(() => new Map());
  // Existing contacts
  const existing = new Map<string, Contact>();
  for (let i = 0; i < emails.length; i += 1000)
    for (const c of await db.select().from(t.contacts).where(inArray(t.contacts.email, emails.slice(i, i + 1000)))) existing.set(c.email, c);

  const job = await db.query.importJobs.findFirst({ where: eq(t.importJobs.id, jobId), columns: { applicationId: true } });
  let imported = 0, updated = 0, skipped = 0, invalid = 0;
  const memberIds: string[] = [];
  const toInsert: (typeof t.contacts.$inferInsert)[] = [];
  for (const [email, { row, rec }] of byEmail) {
    if (suppressed.has(email)) { skipped++; errors.push({ row, email, reason: "On suppression list (unsubscribed/bounced)" }); continue; }
    const chk = o.checkMx ? checks.get(email) : { status: "UNVERIFIED", flags: [] as string[] };
    if (chk?.status === "INVALID") { invalid++; errors.push({ row, email, reason: chk.reason ?? "Invalid" }); continue; }
    const emailStatus = (chk?.status ?? "UNVERIFIED") as Contact["emailStatus"];
    const flags = chk?.flags ?? [];
    const ex = existing.get(email);
    if (ex) {
      if (o.duplicateMode === "skip") { skipped++; memberIds.push(ex.id); errors.push({ row, email, reason: "Already exists (skipped)" }); continue; }
      await db.update(t.contacts).set({
        businessName: rec.businessName ?? ex.businessName, firstName: rec.firstName ?? ex.firstName, lastName: rec.lastName ?? ex.lastName,
        jobTitle: rec.jobTitle ?? ex.jobTitle, phone: rec.phone ?? ex.phone, website: rec.website ?? ex.website, city: rec.city ?? ex.city,
        country: rec.country ?? ex.country, businessType: rec.businessType !== "UNKNOWN" ? rec.businessType : ex.businessType,
        // Never downgrade an opt-in through an import
        consentStatus: ex.consentStatus === "OPTED_IN" ? "OPTED_IN" : rec.consentStatus,
        tags: [...new Set([...ex.tags, ...(rec.tags ?? [])])], customFields: { ...ex.customFields, ...(rec.customFields ?? {}) },
        emailStatus, emailFlags: flags,
      }).where(eq(t.contacts.id, ex.id));
      updated++; memberIds.push(ex.id);
    } else {
      toInsert.push({ ...(rec as typeof t.contacts.$inferInsert), emailStatus, emailFlags: flags, importJobId: jobId, applicationId: job?.applicationId ?? null,
        lawfulBasis: rec.consentStatus === "OPTED_IN" ? "Consent (imported)" : rec.consentStatus === "LEGITIMATE_INTEREST" ? "Legitimate interests (B2B)" : null,
        consentAt: rec.consentStatus === "OPTED_IN" ? new Date() : null });
    }
  }
  for (let i = 0; i < toInsert.length; i += 500) {
    const ins = await db.insert(t.contacts).values(toInsert.slice(i, i + 500)).onConflictDoNothing().returning({ id: t.contacts.id });
    imported += ins.length; memberIds.push(...ins.map((x) => x.id));
  }
  if (o.listId && memberIds.length)
    for (let i = 0; i < memberIds.length; i += 1000)
      await db.insert(t.listMembers).values(memberIds.slice(i, i + 1000).map((contactId) => ({ listId: o.listId!, contactId }))).onConflictDoNothing();

  skipped += duplicatesInFile;
  invalid += errors.filter((e) => /^(Missing email|Invalid email format)$/.test(e.reason)).length;
  await db.update(t.importJobs).set({
    status: "COMPLETED", total: rows.length, imported, updatedCount: updated, skipped, invalid,
    errors, completedAt: new Date(), listId: o.listId, mapping: o.mapping, defaults: o.defaults as unknown as Record<string, string>, rows: [],
  }).where(eq(t.importJobs.id, jobId));
  return { imported, updated, skipped, invalid, errors: errors.length };
}
