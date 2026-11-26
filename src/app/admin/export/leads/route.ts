import { NextRequest } from "next/server";
import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { appScope, inScope } from "@/lib/apps";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const scope = await appScope({ id: s.uid, role: s.role }, sp.get("app"));
  const conds: SQL[] = [inScope(t.leads.applicationId, scope)];
  if (sp.get("q")) conds.push(or(ilike(t.leads.name, `%${sp.get("q")}%`), ilike(t.leads.email, `%${sp.get("q")}%`), ilike(t.leads.businessName, `%${sp.get("q")}%`))!);
  if (sp.get("stage")) conds.push(eq(t.leads.stageId, sp.get("stage")!));
  if (sp.get("country")) conds.push(eq(t.leads.country, sp.get("country")!));
  if (sp.get("source")) conds.push(eq(t.leads.source, sp.get("source") as never));
  if (sp.get("priority")) conds.push(eq(t.leads.priority, sp.get("priority")!));
  if (sp.get("tag")) conds.push(sql`${sp.get("tag")} = any(${t.leads.tags})`);
  if (sp.get("days")) conds.push(gte(t.leads.createdAt, new Date(Date.now() - Number(sp.get("days")) * 86_400_000)));
  const rows = await db.query.leads.findMany({ where: and(...conds), with: { stage: true, owner: true, application: true }, orderBy: desc(t.leads.createdAt) });
  await audit(s.uid, "export", "leads", null, { count: rows.length, filters: Object.fromEntries(sp) });
  const csv = toCsv([
    ["Application", "Name", "Business", "Email", "Phone", "Country", "Stage", "Priority", "Source", "Service", "Budget", "Value", "Currency", "Owner", "Tags", "Created", "External ID", "UTM source", "UTM campaign"],
    ...rows.map((l) => [l.application.name, l.name, l.businessName, l.email, l.phone, l.country, l.stage.name, l.priority, l.source, l.service, l.budget, l.value, l.currency, l.owner?.name, l.tags.join("; "), l.createdAt, l.externalId, (l.utm as Record<string, string> | null)?.utm_source, (l.utm as Record<string, string> | null)?.utm_campaign]),
  ]);
  const name = scope.selected ? scope.selected.key : "all-applications";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${name}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
