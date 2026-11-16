import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, t } from "@/db";
import { Badge, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Case studies" };

export default async function Cases() {
  const rows = await db.select().from(t.caseStudies).orderBy(desc(t.caseStudies.updatedAt));
  return (
    <div>
      <PageHeader title="Case studies" actions={<><Link href="/admin/content" className="btn-ghost">Back</Link><Link href="/admin/content/case-studies/new" className="btn-primary">New case study</Link></>} />
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table className="table-x"><thead><tr><th>Title</th><th>Client</th><th>Industry</th><th>Status</th></tr></thead><tbody>
        {rows.map((c) => <tr key={c.id}><td><Link href={`/admin/content/case-studies/${c.id}`} className="font-semibold hover:underline">{c.title}</Link></td><td>{c.client}</td><td>{c.industry}</td><td><Badge>{c.status}</Badge></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
