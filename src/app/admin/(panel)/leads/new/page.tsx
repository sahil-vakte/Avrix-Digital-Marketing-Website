import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { appScope, stagesForApps } from "@/lib/apps";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { LeadFields } from "../LeadForm";
import { createLead } from "../actions";

export const metadata = { title: "New lead" };

export default async function NewLead({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser();
  const scope = await appScope(user);
  const apps = scope.selected ? [scope.selected] : scope.apps;
  const [stages, users] = await Promise.all([
    stagesForApps(apps.map((a) => a.id)),
    db.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.active, true)),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add lead" />
      <Flash error={error} />
      <Card>
        <form action={createLead} className="space-y-4">
          <LeadFields users={users} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="label">Application and stage</span><select name="stageId" className="input" required>
              {apps.map((a) => <optgroup key={a.id} label={a.name}>{stages.filter((s) => s.applicationId === a.id).map((s) => <option key={s.id} value={s.id}>{a.name} — {s.name}</option>)}</optgroup>)}
            </select></label>
            <label><span className="label">Source</span><select name="source" className="input" defaultValue="MANUAL">{["MANUAL", "PHONE", "WHATSAPP", "OTHER"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select></label>
          </div>
          <label className="block"><span className="label">Notes / message</span><textarea name="message" rows={3} className="input" /></label>
          <SubmitButton>Create lead</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
