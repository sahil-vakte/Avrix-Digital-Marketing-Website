import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { RichEditor } from "@/components/admin/RichEditor";
import { deleteTemplate, saveTemplate } from "../actions";

export const metadata = { title: "Template" };

export default async function TemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const tpl = id === "new" ? null : await db.query.templates.findFirst({ where: eq(t.templates.id, id) });
  if (id !== "new" && !tpl) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={tpl ? tpl.name : "New template"} actions={<Link href="/admin/templates" className="btn-ghost">Back</Link>} />
      <Flash ok={ok} />
      <Card>
        <form action={saveTemplate} className="space-y-4">
          <input type="hidden" name="id" value={tpl?.id ?? ""} />
          <label className="block"><span className="label">Name</span><input name="name" required defaultValue={tpl?.name} className="input" /></label>
          <label className="block"><span className="label">Subject</span><input name="subject" required defaultValue={tpl?.subject} className="input" /></label>
          <div><span className="label">Body</span><RichEditor name="html" initial={tpl?.html ?? ""} mergeTags /></div>
          <SubmitButton>Save template</SubmitButton>
        </form>
        {tpl && <form action={deleteTemplate} className="mt-4 border-t pt-4"><input type="hidden" name="id" value={tpl.id} /><ConfirmButton message="Delete this template?">Delete</ConfirmButton></form>}
      </Card>
    </div>
  );
}
