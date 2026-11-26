import Link from "next/link";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { appScope, inScopeOrShared } from "@/lib/apps";
import { db, t } from "@/db";
import { countContacts, segmentWhere } from "@/lib/audience";
import { AppBadge, Badge, Card, PageHeader, ScopeNote } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { SegmentFields } from "./SegmentFields";
import { createList } from "./actions";

export const metadata = { title: "Lists & segments" };

export default async function Lists() {
  const user = await requireUser();
  const scope = await appScope(user);
  const lists = await db.select({ l: t.lists, members: sql<number>`(select count(*)::int from list_members lm where lm.list_id = ${t.lists.id})` }).from(t.lists)
    .where(inScopeOrShared(t.lists.applicationId, scope, user)).orderBy(desc(t.lists.createdAt));
  const counts = await Promise.all(lists.map((x) => (x.l.type === "SEGMENT"
    ? countContacts(and(segmentWhere(x.l.segmentRules ?? {}), x.l.applicationId ? or(eq(t.contacts.applicationId, x.l.applicationId), isNull(t.contacts.applicationId)) : undefined))
    : Promise.resolve(x.members))));
  return (
    <div>
      <PageHeader title="Lists & segments" sub="Static lists hold the contacts you add. Segments are saved filters that update themselves." />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="table-x"><thead><tr><th>Name</th><th>Application</th><th>Type</th><th>Contacts</th><th>Created</th></tr></thead><tbody>
            {lists.map((x, i) => <tr key={x.l.id}><td><Link href={`/admin/lists/${x.l.id}`} className="font-semibold hover:underline">{x.l.name}</Link><div className="text-xs text-ink-500">{x.l.description}</div></td><td><AppBadge app={scope.apps.find((a) => a.id === x.l.applicationId)} /></td><td><Badge tone={x.l.type === "SEGMENT" ? "violet" : "blue"}>{x.l.type}</Badge></td><td>{counts[i].toLocaleString("en-GB")}</td><td className="text-xs text-ink-500">{fmtDate(x.l.createdAt)}</td></tr>)}
          </tbody></table>
          {!lists.length && <p className="p-8 text-center text-sm text-ink-500">No lists yet. Importing a file creates one automatically.</p>}
        </div>
        <div className="space-y-6">
          <Card title="New static list">
            <form action={createList} className="space-y-3"><input type="hidden" name="type" value="STATIC" />
              <input name="name" required placeholder="List name" className="input" /><input name="description" placeholder="Description (optional)" className="input" />
              <SubmitButton>Create list</SubmitButton></form>
          </Card>
          <Card title="New segment">
            <form action={createList} className="space-y-3"><input type="hidden" name="type" value="SEGMENT" />
              <input name="name" required placeholder="e.g. UK limited companies, not emailed in 30 days" className="input" />
              <SegmentFields /><SubmitButton>Create segment</SubmitButton></form>
          </Card>
        </div>
      </div>
    </div>
  );
}
