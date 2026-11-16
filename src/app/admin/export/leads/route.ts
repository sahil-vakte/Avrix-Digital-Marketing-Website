import { NextRequest } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const conds: SQL[] = [];
  if (sp.get("q")) conds.push(or(ilike(t.leads.name, `%${sp.get("q")}%`), ilike(t.leads.email, `%${sp.get("q")}%`))!);
  if (sp.get("stage")) conds.push(eq(t.leads.stageId, sp.get("stage")!));
  if (sp.get("country")) conds.push(eq(t.leads.country, sp.get("country")!));
  const rows = await db.query.leads.findMany({ where: conds.length ? and(...conds) : undefined, with: { stage: true, owner: true }, orderBy: desc(t.leads.createdAt) });
  await audit(s.uid, "export", "leads", null, { count: rows.length, filters: Object.fromEntries(sp) });
  const csv = toCsv([
    ["Name", "Business", "Email", "Phone", "Country", "Stage", "Source", "Service", "Budget", "Value", "Currency", "Owner", "Tags", "Created", "UTM source", "UTM campaign"],
    ...rows.map((l) => [l.name, l.businessName, l.email, l.phone, l.country, l.stage.name, l.source, l.service, l.budget, l.value, l.currency, l.owner?.name, l.tags.join("; "), l.createdAt, (l.utm as Record<string, string> | null)?.utm_source, (l.utm as Record<string, string> | null)?.utm_campaign]),
  ]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
