import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { RichEditor } from "@/components/admin/RichEditor";
import { deletePost, savePost } from "../../actions";

export const metadata = { title: "Post" };

export default async function PostEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const p = id === "new" ? null : await db.query.posts.findFirst({ where: eq(t.posts.id, id) });
  if (id !== "new" && !p) notFound();
  return (
    <div className="max-w-5xl">
      <PageHeader title={p?.title ?? "New post"} actions={<>{p?.status === "PUBLISHED" && <a href={`/blog/${p.slug}`} target="_blank" className="btn-ghost">View</a>}<Link href="/admin/content/posts" className="btn-ghost">Back</Link></>} />
      <Flash ok={ok} />
      <form action={savePost} className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <Card>
          <div className="space-y-4">
            <input name="title" required defaultValue={p?.title} placeholder="Post title" className="input text-lg font-semibold" />
            <textarea name="excerpt" defaultValue={p?.excerpt ?? ""} rows={2} placeholder="Short summary shown on the blog page" className="input" />
            <RichEditor name="body" initial={p?.body ?? ""} placeholder="Write your article…" minHeight={420} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Publish">
            <div className="space-y-3">
              <select name="status" defaultValue={p?.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
              <SubmitButton className="btn-primary w-full">Save</SubmitButton>
            </div>
          </Card>
          <Card title="Details">
            <div className="space-y-3">
              <label className="block"><span className="label">URL slug</span><input name="slug" defaultValue={p?.slug} placeholder="auto from title" className="input" /></label>
              <label className="block"><span className="label">Category</span><input name="category" defaultValue={p?.category ?? ""} className="input" /></label>
              <label className="block"><span className="label">Cover image URL</span><input name="coverImage" defaultValue={p?.coverImage ?? ""} className="input" /></label>
              <label className="block"><span className="label">SEO title</span><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} className="input" /></label>
              <label className="block"><span className="label">Meta description</span><textarea name="seoDesc" rows={3} defaultValue={p?.seoDesc ?? ""} className="input" /></label>
            </div>
          </Card>
        </div>
      </form>
      {p && <form action={deletePost} className="mt-4"><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this post?">Delete post</ConfirmButton></form>}
    </div>
  );
}
