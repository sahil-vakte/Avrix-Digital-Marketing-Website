import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { appScope, inScopeOrShared } from "@/lib/apps";
import { db, t } from "@/db";
import { AppBadge, PageHeader, Empty, ScopeNote } from "@/components/admin/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Templates" };

export default async function Templates() {
  const user = await requireUser();
  const scope = await appScope(user);
  const rows = await db.select().from(t.templates).where(inScopeOrShared(t.templates.applicationId, scope, user)).orderBy(desc(t.templates.updatedAt));
  return (
    <div>
      <PageHeader title="Email templates" sub="Reusable starting points for campaigns and one-to-one emails." actions={<Link href="/admin/templates/new" className="btn-primary">New template</Link>} />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      {rows.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((r) => (
        <Link key={r.id} href={`/admin/templates/${r.id}`} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-300">
          <p className="font-semibold">{r.name}</p>{r.applicationId ? <AppBadge app={scope.apps.find((a) => a.id === r.applicationId)} className="mt-1" /> : <span className="text-[11px] text-ink-500">Shared by all applications</span>}<p className="mt-1 text-sm text-ink-500">{r.subject}</p>
          <p className="mt-3 line-clamp-3 text-xs text-ink-500">{r.html.replace(/<[^>]+>/g, " ").slice(0, 220)}</p>
          <p className="mt-3 text-[11px] text-ink-300">Updated {fmtDate(r.updatedAt)}</p>
        </Link>
      ))}</div> : <Empty>No templates yet.</Empty>}
    </div>
  );
}
