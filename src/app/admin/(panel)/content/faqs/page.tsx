import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { saveFaq } from "../actions";

export const metadata = { title: "FAQs" };

export default async function Faqs() {
  const rows = await db.select().from(t.faqs).orderBy(asc(t.faqs.order));
  const Form = ({ f }: { f?: typeof rows[number] }) => (
    <form action={saveFaq} className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1.5fr_auto]">
      <input type="hidden" name="id" value={f?.id ?? ""} />
      <input name="question" required defaultValue={f?.question} placeholder="Question" className="input" />
      <textarea name="answer" required defaultValue={f?.answer} rows={2} placeholder="Answer" className="input" />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2"><input name="order" type="number" defaultValue={f?.order ?? rows.length + 1} className="input w-16" aria-label="Order" />
          <select name="page" defaultValue={f?.page ?? "home"} className="input w-24"><option value="home">Home</option><option value="pricing">Pricing</option></select></div>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} /> Show</label>
        <div className="flex gap-1"><SubmitButton className="btn-ghost btn-sm">{f ? "Save" : "Add"}</SubmitButton>{f && <SubmitButton className="btn-ghost btn-sm text-red-600" name="delete" value="1">Delete</SubmitButton>}</div>
      </div>
    </form>
  );
  return (
    <div className="max-w-5xl">
      <PageHeader title="FAQs" actions={<Link href="/admin/content" className="btn-ghost">Back</Link>} />
      <div className="space-y-3">{rows.map((f) => <Form key={f.id} f={f} />)}</div>
      <Card title="Add FAQ" className="mt-6"><Form /></Card>
    </div>
  );
}
