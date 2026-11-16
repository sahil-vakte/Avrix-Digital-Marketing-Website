import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { previewAudience, segmentWhere, countContacts } from "@/lib/audience";
import { Badge, Card, PageHeader, Pagination, Stat } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { SegmentFields } from "../SegmentFields";
import { deleteList, removeMembers, updateList } from "../actions";

export const metadata = { title: "List" };
const PER = 50;

export default async function ListPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page ?? 1));
  const list = await db.query.lists.findFirst({ where: eq(t.lists.id, id) });
  if (!list) notFound();
  const seg = list.type === "SEGMENT";
  const where = seg ? segmentWhere(list.segmentRules ?? {}) : sql`exists (select 1 from list_members lm where lm.contact_id = ${t.contacts.id} and lm.list_id = ${id})`;
  const [rows, total, preview] = await Promise.all([
    db.select().from(t.contacts).where(where).orderBy(desc(t.contacts.createdAt)).limit(PER).offset((page - 1) * PER),
    countContacts(where),
    previewAudience([id]),
  ]);
  return (
    <div>
      <PageHeader title={list.name} sub={<><Badge tone={seg ? "violet" : "blue"}>{list.type}</Badge> {list.description}</>} actions={<><Link href={`/admin/campaigns/new?list=${id}`} className="btn-primary">Email this list</Link><Link href="/admin/lists" className="btn-ghost">Back</Link></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Contacts" value={total.toLocaleString("en-GB")} />
        <Stat label="Eligible to email" value={preview.eligible.toLocaleString("en-GB")} tone="good" sub="after compliance rules" />
        <Stat label="Excluded" value={(preview.total - preview.eligible).toLocaleString("en-GB")} sub={preview.excluded.map((e) => `${e.count} ${e.reason.split(" (")[0].toLowerCase()}`).join(" · ") || "—"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <form action={removeMembers}>
          <input type="hidden" name="listId" value={id} />
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="table-x"><thead><tr>{!seg && <th />}<th>Email</th><th>Business</th><th>Country</th><th>Type</th><th>Consent</th><th>Status</th></tr></thead><tbody>
              {rows.map((c) => <tr key={c.id}>{!seg && <td><input type="checkbox" name="ids" value={c.id} /></td>}<td><Link href={`/admin/contacts/${c.id}`} className="hover:underline">{c.email}</Link></td><td>{c.businessName}</td><td>{c.country}</td><td className="text-xs">{c.businessType.replace(/_/g, " ").toLowerCase()}</td><td><Badge>{c.consentStatus}</Badge></td><td><Badge>{c.emailStatus}</Badge></td></tr>)}
            </tbody></table>
          </div>
          {!seg && rows.length > 0 && <SubmitButton className="btn-ghost btn-sm mt-3">Remove selected from list</SubmitButton>}
          <Pagination page={page} pages={Math.ceil(total / PER)} base={`/admin/lists/${id}`} />
        </form>
        <div className="space-y-6">
          <Card title="Settings">
            <form action={updateList} className="space-y-3"><input type="hidden" name="id" value={id} />
              <input name="name" defaultValue={list.name} className="input" required /><input name="description" defaultValue={list.description ?? ""} className="input" placeholder="Description" />
              {seg && <SegmentFields r={list.segmentRules ?? {}} />}
              <SubmitButton>Save</SubmitButton></form>
            <form action={deleteList} className="mt-4 border-t pt-4"><input type="hidden" name="id" value={id} /><ConfirmButton message="Delete this list? Contacts are kept.">Delete list</ConfirmButton></form>
          </Card>
          {!seg && <Card title="Add contacts"><p className="text-sm text-ink-500">Use <Link href="/admin/contacts/import" className="text-brand-600 underline">Import</Link> or select contacts on the <Link href="/admin/contacts" className="text-brand-600 underline">Contacts</Link> page and choose “Add to list”.</p></Card>}
        </div>
      </div>
    </div>
  );
}
