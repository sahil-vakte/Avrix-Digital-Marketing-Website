import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, t } from "@/db";
import { Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { uploadImport } from "../actions";

export const metadata = { title: "Import contacts" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const jobs = await db.select({ id: t.importJobs.id, fileName: t.importJobs.fileName, status: t.importJobs.status, total: t.importJobs.total, imported: t.importJobs.imported, createdAt: t.importJobs.createdAt })
    .from(t.importJobs).orderBy(desc(t.importJobs.createdAt)).limit(20);
  return (
    <div className="max-w-5xl">
      <PageHeader title="Import contacts" sub="CSV, Excel (.xlsx/.xls) or PDF. Every row is validated before anything is saved." />
      <Flash error={error} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="1. Upload a file">
          <form action={uploadImport} className="space-y-4">
            <input type="file" name="file" required accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf" className="block w-full rounded-lg border border-dashed border-gray-300 p-6 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white" />
            <SubmitButton pendingText="Reading file…">Upload &amp; map columns</SubmitButton>
          </form>
          <p className="mt-4 text-xs text-ink-500">Next you'll map columns, set defaults (country, business type, consent, source) and review the rows. PDFs are parsed line by line — you can correct any row before importing.</p>
        </Card>
        <Card title="Before you import">
          <ul className="list-disc space-y-2 pl-4 text-sm text-ink-700">
            <li>Each contact needs an <b>email</b> and a <b>business name</b>.</li>
            <li>Set <b>business type</b>: sole traders and non-LLP partnerships can only be emailed with consent (UK PECR).</li>
            <li>Record the <b>source</b> — where the data came from — for your GDPR records.</li>
            <li>Addresses on the suppression list are always skipped.</li>
            <li>Domains are checked for a mail server (MX); invalid and disposable addresses are rejected.</li>
          </ul>
          <a href="/sample-contacts.csv" className="btn-ghost btn-sm mt-4">Download sample CSV</a>
        </Card>
      </div>
      <Card title="Recent imports" className="mt-6">
        <table className="table-x"><thead><tr><th>File</th><th>Status</th><th>Rows</th><th>Imported</th><th>Date</th></tr></thead><tbody>
          {jobs.map((j) => <tr key={j.id}><td><Link href={`/admin/contacts/import/${j.id}`} className="hover:underline">{j.fileName}</Link></td><td><Badge tone={j.status === "COMPLETED" ? "green" : j.status === "FAILED" ? "red" : "gray"}>{j.status}</Badge></td><td>{j.total}</td><td>{j.imported}</td><td className="text-xs text-ink-500">{fmtDate(j.createdAt, true)}</td></tr>)}
        </tbody></table>
      </Card>
    </div>
  );
}
