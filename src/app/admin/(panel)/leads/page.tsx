import Link from "next/link";
import { and, asc, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { appScope, inScope, stagesForApps } from "@/lib/apps";
import { getRaw } from "@/lib/settings";
import { AppBadge, Badge, Flash, PageHeader, Pagination, ScopeNote } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate, money } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { Board } from "./Board";
import { bulkMove, deleteView, saveView } from "./actions";

export const metadata = { title: "Leads" };
const SOURCES = ["WEBSITE_FORM", "BOOKING", "CAMPAIGN_REPLY", "MANUAL", "WHATSAPP", "PHONE", "OTHER", "WEBHOOK", "FACEBOOK_LEAD_AD", "CHATBOT", "NEWSLETTER", "JOB_APPLICATION", "SYNC"] as const;
const SORTS = {
  newest: { label: "Newest first", order: [desc(t.leads.createdAt)] },
  oldest: { label: "Oldest first", order: [asc(t.leads.createdAt)] },
  app: { label: "Application, then newest", order: [asc(t.applications.sortOrder), desc(t.leads.createdAt)] },
  name: { label: "Name A–Z", order: [asc(t.leads.name)] },
  value: { label: "Highest value", order: [sql`${t.leads.value} desc nulls last`, desc(t.leads.createdAt)] },
  priority: { label: "Priority", order: [sql`case ${t.leads.priority} when 'high' then 0 when 'normal' then 1 else 2 end`, desc(t.leads.createdAt)] },
  updated: { label: "Recently updated", order: [desc(t.leads.updatedAt)] },
} as const;
type SortKey = keyof typeof SORTS;
const PER = 50;

export default async function Leads({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scope = await appScope(user, sp.app);
  const view = sp.view === "table" ? "table" : "board";
  const sort: SortKey = (sp.sort && sp.sort in SORTS ? sp.sort : scope.selected ? "newest" : "app") as SortKey;
  const page = Math.max(1, Number(sp.page ?? 1));

  const conds: SQL[] = [inScope(t.leads.applicationId, scope)];
  if (sp.q) conds.push(or(ilike(t.leads.name, `%${sp.q}%`), ilike(t.leads.email, `%${sp.q}%`), ilike(t.leads.businessName, `%${sp.q}%`), ilike(t.leads.phone, `%${sp.q}%`))!);
  if (sp.stage) conds.push(eq(t.leads.stageId, sp.stage));
  if (sp.source) conds.push(eq(t.leads.source, sp.source as (typeof SOURCES)[number]));
  if (sp.country) conds.push(eq(t.leads.country, sp.country));
  if (sp.priority) conds.push(eq(t.leads.priority, sp.priority));
  if (sp.owner) conds.push(sp.owner === "me" ? eq(t.leads.ownerId, user.id) : sp.owner === "none" ? sql`${t.leads.ownerId} is null` : eq(t.leads.ownerId, sp.owner));
  if (sp.tag) conds.push(sql`${sp.tag} = any(${t.leads.tags})`);
  if (sp.days) conds.push(gte(t.leads.createdAt, new Date(Date.now() - Number(sp.days) * 86_400_000)));
  if (sp.status === "open") conds.push(sql`not ${t.pipelineStages.isWon} and not ${t.pipelineStages.isLost}`);
  if (sp.status === "won") conds.push(eq(t.pipelineStages.isWon, true));
  if (sp.status === "lost") conds.push(eq(t.pipelineStages.isLost, true));
  if (sp.status === "waiting") conds.push(and(eq(t.pipelineStages.order, sql`(select min(s2."order") from pipeline_stages s2 where s2.application_id = ${t.leads.applicationId})`), lt(t.leads.createdAt, new Date(Date.now() - 48 * 3_600_000)))!);
  const where = and(...conds);

  const [stages, users, views] = await Promise.all([
    stagesForApps(scope.selected ? [scope.selected.id] : scope.ids),
    db.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.active, true)),
    getRaw<{ name: string; query: string }[]>(`views.leads.${user.id}`),
  ]);
  const base = db.select({ l: t.leads, stage: t.pipelineStages, app: t.applications, ownerName: t.users.name }).from(t.leads)
    .innerJoin(t.pipelineStages, eq(t.pipelineStages.id, t.leads.stageId))
    .innerJoin(t.applications, eq(t.applications.id, t.leads.applicationId))
    .leftJoin(t.users, eq(t.users.id, t.leads.ownerId))
    .where(where).orderBy(...SORTS[sort].order);
  const rows = await (view === "board" ? base.limit(800) : base.limit(PER).offset((page - 1) * PER));
  const [{ n: total }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.leads)
    .innerJoin(t.pipelineStages, eq(t.pipelineStages.id, t.leads.stageId)).where(where);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const withParam = (k: string, v: string) => `/admin/leads?${new URLSearchParams({ ...(sp as Record<string, string>), [k]: v })}`;
  const appsShown = scope.selected ? [scope.selected] : scope.apps;

  return (
    <div>
      <PageHeader title="Leads" sub={`${total} lead${total === 1 ? "" : "s"}${scope.selected ? ` in ${scope.selected.name}` : " across all applications"}`} actions={<>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <Link href={withParam("view", "board")} className={`rounded-md px-3 py-1.5 ${view === "board" ? "bg-brand-600 text-white" : ""}`}>Board</Link>
          <Link href={withParam("view", "table")} className={`rounded-md px-3 py-1.5 ${view === "table" ? "bg-brand-600 text-white" : ""}`}>Table</Link>
        </div>
        {user.role === "ADMIN" && <a href={`/admin/export/leads?${qs}${scope.selected && !sp.app ? `&app=${scope.selected.id}` : ""}`} className="btn-ghost">Export CSV</a>}
        <Link href="/admin/leads/new" className="btn-primary">Add lead</Link>
      </>} />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      <Flash error={sp.error} ok={sp.ok} />

      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={sp.q} placeholder="Search name, email, business, phone" className="input w-60" />
        <select name="app" defaultValue={sp.app ?? scope.selected?.id ?? ""} className="input w-48" aria-label="Application">
          <option value="all">All applications</option>
          {scope.apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select name="stage" defaultValue={sp.stage ?? ""} className="input w-48" aria-label="Stage"><option value="">All stages</option>
          {appsShown.map((a) => <optgroup key={a.id} label={a.name}>{stages.filter((s) => s.applicationId === a.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-44" aria-label="Status"><option value="">Open, won and lost</option><option value="open">Open only</option><option value="waiting">Not contacted after 48h</option><option value="won">Won</option><option value="lost">Lost</option></select>
        <select name="source" defaultValue={sp.source ?? ""} className="input w-40" aria-label="Source"><option value="">All sources</option>{SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</select>
        <select name="priority" defaultValue={sp.priority ?? ""} className="input w-32" aria-label="Priority"><option value="">Any priority</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>
        <select name="country" defaultValue={sp.country ?? ""} className="input w-36" aria-label="Country"><option value="">All countries</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <select name="owner" defaultValue={sp.owner ?? ""} className="input w-36" aria-label="Owner"><option value="">Any owner</option><option value="me">Mine</option><option value="none">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <input name="tag" defaultValue={sp.tag} placeholder="Tag" className="input w-28" />
        <select name="days" defaultValue={sp.days ?? ""} className="input w-36" aria-label="Date"><option value="">Any date</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        <select name="sort" defaultValue={sort} className="input w-48" aria-label="Sort">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
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
        <div className="space-y-8">
          {appsShown.map((a) => {
            const appLeads = rows.filter((r) => r.l.applicationId === a.id);
            const appStages = stages.filter((s) => s.applicationId === a.id);
            if (!scope.selected && !appLeads.length) return null;
            return (
              <section key={a.id}>
                {!scope.selected && <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><AppBadge app={a} /><span className="text-xs font-normal text-ink-500">{appLeads.length} lead{appLeads.length === 1 ? "" : "s"}</span>
                  <Link href={`/admin/leads?app=${a.id}&view=board`} className="text-xs font-normal text-brand-600">Open this pipeline →</Link></h2>}
                <Board stages={appStages} leads={appLeads.map(({ l }) => ({ id: l.id, name: l.name, businessName: l.businessName, value: l.value, currency: l.currency, source: l.source, stageId: l.stageId, priority: l.priority, createdAt: l.createdAt.toISOString() }))} />
              </section>
            );
          })}
          {!scope.selected && rows.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-ink-500">No leads match these filters.</p>}
          {rows.length >= 800 && <p className="text-xs text-ink-500">Showing the first 800 leads. Narrow the filters or use the table view to see the rest.</p>}
        </div>
      ) : (
        <form action={bulkMove}>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="table-x">
              <thead><tr><th></th><th>Name</th><th>Application</th><th>Business</th><th>Stage</th><th>Source</th><th>Priority</th><th>Value</th><th>Owner</th><th>Created</th></tr></thead>
              <tbody>{rows.map(({ l, stage, app, ownerName }) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td><input type="checkbox" name="ids" value={l.id} aria-label={`Select ${l.name}`} /></td>
                  <td><Link href={`/admin/leads/${l.id}`} className="font-semibold hover:underline">{l.name}</Link><div className="text-xs text-ink-500">{l.email || l.phone}</div></td>
                  <td><AppBadge app={app} /></td>
                  <td>{l.businessName}</td><td><span className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />{stage.name}</span></td>
                  <td className="text-xs">{l.source.replace(/_/g, " ").toLowerCase()}</td>
                  <td>{l.priority === "high" ? <Badge tone="red">High</Badge> : l.priority === "low" ? <Badge tone="gray">Low</Badge> : <span className="text-xs text-ink-500">Normal</span>}</td>
                  <td>{money(l.value, l.currency)}</td><td className="text-xs">{ownerName ?? "—"}</td><td className="text-xs text-ink-500">{fmtDate(l.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
            {!rows.length && <p className="p-8 text-center text-sm text-ink-500">No leads match these filters.</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-xs text-ink-500">With selected:</span>
            <select name="stageId" className="input w-56" required defaultValue=""><option value="" disabled>Move to stage…</option>
              {appsShown.map((a) => <optgroup key={a.id} label={a.name}>{stages.filter((s) => s.applicationId === a.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
            </select>
            <SubmitButton className="btn-ghost btn-sm">Apply</SubmitButton>
            <span className="text-xs text-ink-500">Leads only move to stages in their own application.</span></div>
          <Pagination page={page} pages={Math.ceil(total / PER)} base={`/admin/leads?${qs}`} />
        </form>
      )}
    </div>
  );
}
