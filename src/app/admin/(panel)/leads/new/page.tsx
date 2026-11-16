import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { LeadFields } from "../LeadForm";
import { createLead } from "../actions";

export const metadata = { title: "New lead" };

export default async function NewLead({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [stages, users] = await Promise.all([
    db.select().from(t.pipelineStages).orderBy(asc(t.pipelineStages.order)),
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
            <label><span className="label">Stage</span><select name="stageId" className="input">{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span className="label">Source</span><select name="source" className="input" defaultValue="MANUAL">{["MANUAL", "PHONE", "WHATSAPP", "OTHER"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select></label>
          </div>
          <label className="block"><span className="label">Notes / message</span><textarea name="message" rows={3} className="input" /></label>
          <SubmitButton>Create lead</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
