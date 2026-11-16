import { NextRequest } from "next/server";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const c: SQL[] = [];
  if (sp.get("q")) c.push(or(ilike(t.contacts.email, `%${sp.get("q")}%`), ilike(t.contacts.businessName, `%${sp.get("q")}%`))!);
  if (sp.get("country")) c.push(eq(t.contacts.country, sp.get("country")!));
  if (sp.get("type")) c.push(eq(t.contacts.businessType, sp.get("type") as never));
  if (sp.get("consent")) c.push(eq(t.contacts.consentStatus, sp.get("consent") as never));
  if (sp.get("status")) c.push(eq(t.contacts.emailStatus, sp.get("status") as never));
  if (sp.get("tag")) c.push(sql`${sp.get("tag")} = any(${t.contacts.tags})`);
  if (sp.get("list")) c.push(sql`exists (select 1 from list_members lm where lm.contact_id = ${t.contacts.id} and lm.list_id = ${sp.get("list")})`);
  const rows = await db.select().from(t.contacts).where(c.length ? and(...c) : undefined).orderBy(desc(t.contacts.createdAt));
  await audit(s.uid, "export", "contacts", null, { count: rows.length });
  const csv = toCsv([
    ["Email", "Business name", "First name", "Last name", "Job title", "Phone", "Website", "City", "Country", "Business type", "Consent", "Consent date", "Lawful basis", "Source", "Email status", "Tags", "Last emailed", "Created"],
    ...rows.map((r) => [r.email, r.businessName, r.firstName, r.lastName, r.jobTitle, r.phone, r.website, r.city, r.country, r.businessType, r.consentStatus, r.consentAt, r.lawfulBasis, r.source, r.emailStatus, r.tags.join("; "), r.lastEmailedAt, r.createdAt]),
  ]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
