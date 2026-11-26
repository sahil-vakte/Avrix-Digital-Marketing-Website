import { asc, desc, inArray, isNull, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { appScope } from "@/lib/apps";
import { db, t } from "@/db";
import { Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { createCampaign } from "../actions";

export const metadata = { title: "New campaign" };

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list } = await searchParams;
  const user = await requireUser();
  const scope = await appScope(user);
  const apps = (scope.selected ? [scope.selected] : scope.apps).filter((a) => a.campaignsAllowed && a.dataClass !== "HEALTH" && a.active);
  const ids = apps.map((a) => a.id);
  const [lists, templates] = await Promise.all([
    ids.length ? db.select().from(t.lists).where(or(inArray(t.lists.applicationId, ids), isNull(t.lists.applicationId))).orderBy(asc(t.lists.name)) : Promise.resolve([]),
    db.select().from(t.templates).where(ids.length ? or(inArray(t.templates.applicationId, ids), isNull(t.templates.applicationId)) : isNull(t.templates.applicationId)).orderBy(desc(t.templates.updatedAt)),
  ]);
  const appName = (id: string | null) => apps.find((a) => a.id === id)?.name;
  if (!apps.length) return <div className="max-w-2xl"><PageHeader title="New campaign" /><Card><p className="text-sm">Campaigns are switched off for {scope.selected ? scope.selected.name : "every application you can access"}. Health applications never send campaigns. Pick a business application in the switcher.</p></Card></div>;
  return (
    <div className="max-w-2xl">
      <PageHeader title="New campaign" />
      <Card>
        <form action={createCampaign} className="space-y-4">
          <label className="block"><span className="label">Application (sender, footer and audience)</span>
            <select name="applicationId" className="input" defaultValue={scope.selected?.id ?? apps[0].id}>{apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="block"><span className="label">Campaign name (internal)</span><input name="name" required placeholder="e.g. Leicester manufacturers — Nov 2026" className="input" /></label>
          <fieldset><legend className="label">Send to</legend>
            <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-gray-200 p-3">
              {lists.map((l) => <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="listIds" value={l.id} defaultChecked={l.id === list} />{l.name} <span className="text-xs text-ink-500">({l.type.toLowerCase()}{appName(l.applicationId) ? ` · ${appName(l.applicationId)}` : ""})</span></label>)}
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
