import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, t } from "@/db";
import { Badge, PageHeader } from "@/components/admin/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Blog posts" };

export default async function Posts() {
  const rows = await db.select().from(t.posts).orderBy(desc(t.posts.updatedAt));
  return (
    <div>
      <PageHeader title="Blog posts" actions={<><Link href="/admin/content" className="btn-ghost">Back</Link><Link href="/admin/content/posts/new" className="btn-primary">New post</Link></>} />
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table className="table-x"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th>Updated</th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id}><td><Link href={`/admin/content/posts/${p.id}`} className="font-semibold hover:underline">{p.title}</Link><div className="text-xs text-ink-500">/blog/{p.slug}</div></td><td>{p.category}</td><td><Badge>{p.status}</Badge></td><td className="text-xs">{fmtDate(p.publishedAt)}</td><td className="text-xs text-ink-500">{fmtDate(p.updatedAt)}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
