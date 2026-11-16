import { desc, eq, ilike, sql, and, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Pagination } from "@/components/admin/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const PER = 100;

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string; page?: string }> }) {
  await requireUser({ admin: true });
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const c: SQL[] = [];
  if (sp.q) c.push(ilike(t.auditLogs.action, `%${sp.q}%`));
  if (sp.entity) c.push(eq(t.auditLogs.entity, sp.entity));
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select({ a: t.auditLogs, user: t.users.name }).from(t.auditLogs).leftJoin(t.users, eq(t.users.id, t.auditLogs.userId)).where(where).orderBy(desc(t.auditLogs.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(t.auditLogs).where(where),
  ]);
  return (
    <div>
      <PageHeader title="Audit log" sub="Sign-ins, imports, sends, exports, deletions and settings changes." />
      <form className="mb-3 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Action contains…" className="input w-48" /><input name="entity" defaultValue={sp.entity} placeholder="Entity (e.g. campaign)" className="input w-48" /><button className="btn-ghost">Filter</button></form>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table className="table-x"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead><tbody>
        {rows.map(({ a, user }) => <tr key={a.id}><td className="whitespace-nowrap text-xs">{fmtDate(a.createdAt, true)}</td><td className="text-sm">{user ?? "system"}</td><td className="text-sm font-medium">{a.action}</td><td className="text-xs">{a.entity}{a.entityId ? ` · ${a.entityId.slice(0, 10)}` : ""}</td><td className="max-w-md truncate font-mono text-[11px] text-ink-500" title={a.diff ? JSON.stringify(a.diff) : ""}>{a.diff ? JSON.stringify(a.diff) : ""}</td><td className="text-xs text-ink-500">{a.ip}</td></tr>)}
      </tbody></table></div>
      <Pagination page={page} pages={Math.ceil(n / PER)} base={`/admin/audit?q=${sp.q ?? ""}&entity=${sp.entity ?? ""}`} />
    </div>
  );
}
