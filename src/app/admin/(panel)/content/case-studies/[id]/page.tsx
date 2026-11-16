import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { RichEditor } from "@/components/admin/RichEditor";
import { deleteCase, saveCase } from "../../actions";

export const metadata = { title: "Case study" };

export default async function CaseEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const c = id === "new" ? null : await db.query.caseStudies.findFirst({ where: eq(t.caseStudies.id, id) });
  if (id !== "new" && !c) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={c?.title ?? "New case study"} actions={<Link href="/admin/content/case-studies" className="btn-ghost">Back</Link>} />
      <Flash ok={ok} />
      <Card>
        <form action={saveCase} className="space-y-4">
          <input type="hidden" name="id" value={c?.id ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="label">Title</span><input name="title" required defaultValue={c?.title} className="input" /></label>
            <label><span className="label">Client</span><input name="client" required defaultValue={c?.client} className="input" /></label>
            <label><span className="label">Industry</span><input name="industry" defaultValue={c?.industry ?? ""} className="input" /></label>
            <label><span className="label">URL slug</span><input name="slug" defaultValue={c?.slug} className="input" /></label>
            <label><span className="label">Cover image URL</span><input name="coverImage" defaultValue={c?.coverImage ?? ""} className="input" /></label>
            <label className="sm:col-span-2"><span className="label">Summary</span><textarea name="summary" required rows={2} defaultValue={c?.summary} className="input" /></label>
            <label className="sm:col-span-2"><span className="label">Headline results (one per line)</span><textarea name="results" rows={3} defaultValue={(c?.results ?? []).join("\n")} className="input" /></label>
          </div>
          <RichEditor name="body" initial={c?.body ?? ""} minHeight={300} />
          <div className="flex items-center gap-3"><select name="status" defaultValue={c?.status ?? "DRAFT"} className="input w-40"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select><SubmitButton>Save</SubmitButton></div>
        </form>
        {c && <form action={deleteCase} className="mt-4 border-t pt-4"><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Delete this case study?">Delete</ConfirmButton></form>}
      </Card>
    </div>
  );
}
