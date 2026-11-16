import { asc, desc } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { createCampaign } from "../actions";

export const metadata = { title: "New campaign" };

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list } = await searchParams;
  const [lists, templates] = await Promise.all([
    db.select().from(t.lists).orderBy(asc(t.lists.name)),
    db.select().from(t.templates).orderBy(desc(t.templates.updatedAt)),
  ]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="New campaign" />
      <Card>
        <form action={createCampaign} className="space-y-4">
          <label className="block"><span className="label">Campaign name (internal)</span><input name="name" required placeholder="e.g. Leicester manufacturers — Nov 2026" className="input" /></label>
          <fieldset><legend className="label">Send to</legend>
            <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-gray-200 p-3">
              {lists.map((l) => <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="listIds" value={l.id} defaultChecked={l.id === list} />{l.name} <span className="text-xs text-ink-500">({l.type.toLowerCase()})</span></label>)}
              {!lists.length && <p className="text-sm text-ink-500">No lists yet — import contacts first.</p>}
            </div>
          </fieldset>
          <label className="block"><span className="label">Start from template</span><select name="templateId" className="input"><option value="">Blank</option>{templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></label>
          <SubmitButton>Create &amp; continue</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
