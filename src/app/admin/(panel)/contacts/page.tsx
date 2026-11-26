import Link from "next/link";
import { and, asc, desc, eq, ilike, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { appScope, inScopeOrShared } from "@/lib/apps";
import { getSetting } from "@/lib/settings";
import { AppBadge, Badge, Flash, PageHeader, Pagination, ScopeNote } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { COUNTRIES } from "@/lib/countries";
import { fmtDate } from "@/lib/utils";
import { BUSINESS_TYPES, CONSENT } from "./ContactFields";
import { bulkContacts } from "./actions";

export const metadata = { title: "Contacts" };
const PER = 50;

export default async function Contacts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const comp = await getSetting("compliance");
  const scope = await appScope(user, sp.app);
  const c: SQL[] = [inScopeOrShared(t.contacts.applicationId, scope, user)];
  if (sp.q) c.push(or(ilike(t.contacts.email, `%${sp.q}%`), ilike(t.contacts.businessName, `%${sp.q}%`), ilike(t.contacts.firstName, `%${sp.q}%`), ilike(t.contacts.lastName, `%${sp.q}%`))!);
  if (sp.country) c.push(eq(t.contacts.country, sp.country));
  if (sp.type) c.push(eq(t.contacts.businessType, sp.type as never));
  if (sp.consent) c.push(eq(t.contacts.consentStatus, sp.consent as never));
  if (sp.status) c.push(eq(t.contacts.emailStatus, sp.status as never));
  if (sp.tag) c.push(sql`${sp.tag} = any(${t.contacts.tags})`);
  if (sp.list) c.push(sql`exists (select 1 from list_members lm where lm.contact_id = ${t.contacts.id} and lm.list_id = ${sp.list})`);
  if (sp.stale) {
    const cutoff = new Date(Date.now() - comp.retentionMonths * 30 * 86_400_000);
    c.push(and(lt(t.contacts.createdAt, cutoff), or(isNull(t.contacts.lastEngagedAt), lt(t.contacts.lastEngagedAt, cutoff)))!);
  }
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ n }], lists] = await Promise.all([
    db.select().from(t.contacts).where(where).orderBy(desc(t.contacts.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(t.contacts).where(where),
    db.select({ id: t.lists.id, name: t.lists.name }).from(t.lists).where(and(eq(t.lists.type, "STATIC"), inScopeOrShared(t.lists.applicationId, scope, user))).orderBy(asc(t.lists.name)),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page" && k !== "ok" && k !== "error") as [string, string][]).toString();

  return (
    <div>
      <PageHeader title="Contacts" sub={`${n.toLocaleString("en-GB")} contact${n === 1 ? "" : "s"}`} actions={<>
        {user.role === "ADMIN" && <a href={`/admin/export/contacts?${qs}`} className="btn-ghost">Export CSV</a>}
        <Link href="/admin/contacts/import" className="btn-ghost">Import</Link>
        <Link href="/admin/contacts/new" className="btn-primary">Add contact</Link>
      </>} />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      <Flash ok={sp.ok} error={sp.error} />
      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3">
        <input name="q" defaultValue={sp.q} placeholder="Search email, business, name" className="input w-56" />
        <select name="app" defaultValue={sp.app ?? scope.selected?.id ?? "all"} className="input w-44" aria-label="Application"><option value="all">All applications</option>{scope.apps.filter((a) => a.dataClass !== "HEALTH").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select name="country" defaultValue={sp.country ?? ""} className="input w-36"><option value="">All countries</option>{COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select>
        <select name="type" defaultValue={sp.type ?? ""} className="input w-40"><option value="">Any business type</option>{BUSINESS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="consent" defaultValue={sp.consent ?? ""} className="input w-36"><option value="">Any consent</option>{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-36"><option value="">Any email status</option>{["VALID", "RISKY", "UNVERIFIED", "INVALID", "BOUNCED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select>
        <select name="list" defaultValue={sp.list ?? ""} className="input w-40"><option value="">Any list</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <input name="tag" defaultValue={sp.tag} placeholder="Tag" className="input w-28" />
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="stale" value="1" defaultChecked={!!sp.stale} /> No engagement in {comp.retentionMonths} months</label>
        <button className="btn-primary">Filter</button><Link href="/admin/contacts" className="btn-ghost">Reset</Link>
      </form>

      <form action={bulkContacts}>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="table-x">
            <thead><tr><th><span className="sr-only">Select</span></th><th>Email</th><th>Application</th><th>Business</th><th>Name</th><th>Country</th><th>Type</th><th>Consent</th><th>Email status</th><th>Tags</th><th>Last emailed</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td><input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.email}`} /></td>
                <td><Link href={`/admin/contacts/${r.id}`} className="font-medium hover:underline">{r.email}</Link></td>
                <td><AppBadge app={scope.apps.find((a) => a.id === r.applicationId)} /></td>
                <td>{r.businessName}</td><td>{[r.firstName, r.lastName].filter(Boolean).join(" ")}</td><td>{r.country}</td>
                <td className="text-xs">{BUSINESS_TYPES.find(([v]) => v === r.businessType)?.[1]}</td>
                <td><Badge>{r.consentStatus}</Badge></td><td><Badge>{r.emailStatus}</Badge>{r.emailFlags.includes("role") && <span className="ml-1 text-[10px] text-ink-500">role</span>}</td>
                <td className="max-w-[160px] truncate text-xs">{r.tags.join(", ")}</td><td className="text-xs text-ink-500">{fmtDate(r.lastEmailedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-sm text-ink-500">No contacts match. <Link href="/admin/contacts/import" className="text-brand-600 underline">Import a list</Link>.</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm">
          <span className="text-xs font-semibold text-ink-500">With selected:</span>
          <select name="listId" className="input w-44" defaultValue=""><option value="">Choose list…</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <SubmitButton className="btn-ghost btn-sm" name="op" value="list">Add to list</SubmitButton>
          <input name="tag" placeholder="tag" className="input w-28" /><SubmitButton className="btn-ghost btn-sm" name="op" value="tag">Add tag</SubmitButton>
          <select name="businessType" className="input w-40">{BUSINESS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><SubmitButton className="btn-ghost btn-sm" name="op" value="type">Set type</SubmitButton>
          <select name="consentStatus" className="input w-40">{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><SubmitButton className="btn-ghost btn-sm" name="op" value="consent">Set consent</SubmitButton>
          {user.role === "ADMIN" && <ConfirmButton name="op" value="delete" message="Delete the selected contacts? Their campaign history is kept but unlinked.">Delete</ConfirmButton>}
        </div>
      </form>
      <Pagination page={page} pages={Math.ceil(n / PER)} base={`/admin/contacts?${qs}`} />
    </div>
  );
}
