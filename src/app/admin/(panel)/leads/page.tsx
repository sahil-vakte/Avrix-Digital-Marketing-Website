import Link from "next/link";
import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { getRaw } from "@/lib/settings";
import { Badge, PageHeader, Pagination } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate, money } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { Board } from "./Board";
import { bulkMove, deleteView, saveView } from "./actions";

export const metadata = { title: "Leads" };
const SOURCES = ["WEBSITE_FORM", "BOOKING", "CAMPAIGN_REPLY", "MANUAL", "WHATSAPP", "PHONE", "OTHER"] as const;
const PER = 50;

export default async function Leads({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const page = Math.max(1, Number(sp.page ?? 1));
  const conds: SQL[] = [];
  if (sp.q) conds.push(or(ilike(t.leads.name, `%${sp.q}%`), ilike(t.leads.email, `%${sp.q}%`), ilike(t.leads.businessName, `%${sp.q}%`))!);
  if (sp.stage) conds.push(eq(t.leads.stageId, sp.stage));
  if (sp.source) conds.push(eq(t.leads.source, sp.source as (typeof SOURCES)[number]));
  if (sp.country) conds.push(eq(t.leads.country, sp.country));
  if (sp.owner) conds.push(sp.owner === "me" ? eq(t.leads.ownerId, user.id) : eq(t.leads.ownerId, sp.owner));
  if (sp.tag) conds.push(sql`${sp.tag} = any(${t.leads.tags})`);
  if (sp.days) conds.push(gte(t.leads.createdAt, new Date(Date.now() - Number(sp.days) * 86_400_000)));
  const where = conds.length ? and(...conds) : undefined;

  const [stages, users, views] = await Promise.all([
    db.select().from(t.pipelineStages).orderBy(asc(t.pipelineStages.order)),
    db.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.active, true)),
    getRaw<{ name: string; query: string }[]>(`views.leads.${user.id}`),
  ]);
  const leads = await db.query.leads.findMany({ where, with: { stage: true, owner: true }, orderBy: desc(t.leads.createdAt), limit: view === "board" ? 500 : PER, offset: view === "board" ? 0 : (page - 1) * PER });
  const [{ n: total }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.leads).where(where);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();

  return (
    <div>
      <PageHeader title="Leads" sub={`${total} lead${total === 1 ? "" : "s"}`} actions={<>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <Link href={`/admin/leads?${new URLSearchParams({ ...sp, view: "board" } as Record<string, string>)}`} className={`rounded-md px-3 py-1.5 ${view === "board" ? "bg-brand-600 text-white" : ""}`}>Board</Link>
          <Link href={`/admin/leads?${new URLSearchParams({ ...sp, view: "table" } as Record<string, string>)}`} className={`rounded-md px-3 py-1.5 ${view === "table" ? "bg-brand-600 text-white" : ""}`}>Table</Link>
        </div>
        {user.role === "ADMIN" && <a href={`/admin/export/leads?${qs}`} className="btn-ghost">Export CSV</a>}
        <Link href="/admin/leads/new" className="btn-primary">Add lead</Link>
      </>} />

      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={sp.q} placeholder="Search name, email, business" className="input w-56" />
        <select name="stage" defaultValue={sp.stage ?? ""} className="input w-40"><option value="">All stages</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select name="source" defaultValue={sp.source ?? ""} className="input w-40"><option value="">All sources</option>{SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</select>
        <select name="country" defaultValue={sp.country ?? ""} className="input w-36"><option value="">All countries</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <select name="owner" defaultValue={sp.owner ?? ""} className="input w-36"><option value="">Any owner</option><option value="me">Mine</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <input name="tag" defaultValue={sp.tag} placeholder="Tag" className="input w-28" />
        <select name="days" defaultValue={sp.days ?? ""} className="input w-36"><option value="">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        <button className="btn-primary">Filter</button>
        <Link href={`/admin/leads?view=${view}`} className="btn-ghost">Reset</Link>
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-semibold text-ink-500">Saved views:</span>
        {(views ?? []).map((v) => (
          <span key={v.name} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-3 text-xs">
            <Link href={`/admin/leads?${v.query}`} className="hover:underline">{v.name}</Link>
            <form action={deleteView}><input type="hidden" name="name" value={v.name} /><button className="px-2 text-ink-300 hover:text-red-600" aria-label={`Delete view ${v.name}`}>×</button></form>
          </span>
        ))}
        {qs && <form action={saveView} className="flex gap-1"><input type="hidden" name="query" value={qs} /><input name="name" placeholder="Name this view" className="input h-7 w-36 py-0 text-xs" required /><SubmitButton className="btn-ghost btn-sm">Save view</SubmitButton></form>}
      </div>

      {view === "board" ? (
        <Board stages={stages} leads={leads.map((l) => ({ id: l.id, name: l.name, businessName: l.businessName, value: l.value, currency: l.currency, source: l.source, stageId: l.stageId, createdAt: l.createdAt.toISOString() }))} />
      ) : (
        <form action={bulkMove}>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="table-x">
              <thead><tr><th></th><th>Name</th><th>Business</th><th>Stage</th><th>Source</th><th>Country</th><th>Value</th><th>Owner</th><th>Created</th></tr></thead>
              <tbody>{leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td><input type="checkbox" name="ids" value={l.id} aria-label={`Select ${l.name}`} /></td>
                  <td><Link href={`/admin/leads/${l.id}`} className="font-semibold hover:underline">{l.name}</Link><div className="text-xs text-ink-500">{l.email}</div></td>
                  <td>{l.businessName}</td><td><Badge tone="blue">{l.stage.name}</Badge></td>
                  <td className="text-xs">{l.source.replace(/_/g, " ").toLowerCase()}</td><td>{l.country}</td>
                  <td>{money(l.value, l.currency)}</td><td className="text-xs">{l.owner?.name ?? "—"}</td><td className="text-xs text-ink-500">{fmtDate(l.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm"><span className="text-xs text-ink-500">With selected:</span>
            <select name="stageId" className="input w-44" required defaultValue=""><option value="" disabled>Move to stage…</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <SubmitButton className="btn-ghost btn-sm">Apply</SubmitButton></div>
          <Pagination page={page} pages={Math.ceil(total / PER)} base={`/admin/leads?${qs}`} />
        </form>
      )}
    </div>
  );
}
