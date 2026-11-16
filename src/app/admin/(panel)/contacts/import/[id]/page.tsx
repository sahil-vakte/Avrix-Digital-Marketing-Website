import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader, Stat } from "@/components/admin/ui";
import { fmtDate } from "@/lib/utils";
import { ImportMapper } from "./ImportMapper";
import { runImport } from "../../actions";

export const metadata = { title: "Import" };

export default async function ImportJob({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const job = await db.query.importJobs.findFirst({ where: eq(t.importJobs.id, id) });
  if (!job) notFound();

  if (job.status === "UPLOADED" || job.status === "MAPPED") {
    const [templates, lists] = await Promise.all([
      db.select().from(t.importMappings).orderBy(asc(t.importMappings.name)),
      db.select({ id: t.lists.id, name: t.lists.name }).from(t.lists).where(eq(t.lists.type, "STATIC")).orderBy(asc(t.lists.name)),
    ]);
    return (
      <div className="max-w-7xl">
        <PageHeader title="Map & review import" actions={<Link href="/admin/contacts/import" className="btn-ghost">Cancel</Link>} />
        <Flash error={error} />
        <ImportMapper jobId={job.id} fileName={job.fileName} kind={job.fileType} headers={job.headers} rows={job.total <= 1000 ? job.rows : job.rows.slice(0, 50)} total={job.total}
          initialMapping={(job.mapping ?? {}) as Record<string, string>} templates={templates} lists={lists} action={runImport} />
      </div>
    );
  }
  const errors = job.errors ?? [];
  return (
    <div className="max-w-5xl">
      <PageHeader title={job.status === "FAILED" ? "Import failed" : job.status === "PROCESSING" ? "Import in progress…" : "Import complete"} sub={`${job.fileName} · ${fmtDate(job.completedAt ?? job.createdAt, true)}`}
        actions={<><Link href="/admin/contacts/import" className="btn-ghost">New import</Link>{job.listId && <Link href={`/admin/lists/${job.listId}`} className="btn-primary">View list</Link>}</>} />
      <div className="grid gap-4 sm:grid-cols-5">
        <Stat label="Rows" value={job.total} /><Stat label="New contacts" value={job.imported} tone="good" sub="added" /><Stat label="Updated" value={job.updatedCount} />
        <Stat label="Skipped" value={job.skipped} sub="duplicates / suppressed" /><Stat label="Invalid" value={job.invalid} tone={job.invalid ? "bad" : undefined} />
      </div>
      {errors.length > 0 && (
        <Card title={`Rows not imported or skipped (${errors.length})`} className="mt-6" actions={<a href={`/admin/export/import-errors/${job.id}`} className="btn-ghost btn-sm">Download CSV</a>}>
          <div className="max-h-[420px] overflow-auto"><table className="table-x"><thead><tr><th>Row</th><th>Email</th><th>Reason</th></tr></thead>
            <tbody>{errors.slice(0, 500).map((e, i) => <tr key={i}><td>{e.row}</td><td>{e.email}</td><td className="text-sm">{e.reason}</td></tr>)}</tbody></table></div>
        </Card>
      )}
    </div>
  );
}
