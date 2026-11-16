import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { COUNTRIES } from "@/lib/countries";
import { ContactFields, BUSINESS_TYPES, CONSENT } from "../ContactFields";
import { createContact, quickAddContacts } from "../actions";

export const metadata = { title: "Add contact" };

export default async function NewContact({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const lists = await db.select().from(t.lists).where(eq(t.lists.type, "STATIC")).orderBy(asc(t.lists.name));
  const listSelect = <label><span className="label">Add to list</span><select name="listId" className="input"><option value="">— none —</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>;
  return (
    <div className="grid max-w-6xl gap-6 xl:grid-cols-2">
      <div>
        <PageHeader title="Add a contact" />
        <Flash error={error} />
        <Card>
          <form action={createContact} className="space-y-4">
            <label className="block"><span className="label">Email *</span><input name="email" type="email" required className="input" /></label>
            <ContactFields />
            {listSelect}
            <SubmitButton>Create contact</SubmitButton>
          </form>
        </Card>
      </div>
      <div>
        <PageHeader title="Paste many" sub="One contact per line: email, business name, first name, last name" />
        <Card>
          <form action={quickAddContacts} className="space-y-3">
            <textarea name="bulk" rows={10} required className="input font-mono text-xs" placeholder={"jane@acme-ltd.co.uk, Acme Ltd, Jane, Smith\nsales@brightway.ie, Brightway Ltd"} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label">Country</span><select name="country" className="input" defaultValue="GB">{COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label>
              <label><span className="label">Business type</span><select name="businessType" className="input" defaultValue="LIMITED_COMPANY">{BUSINESS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label><span className="label">Consent</span><select name="consentStatus" className="input" defaultValue="LEGITIMATE_INTEREST">{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label><span className="label">Source *</span><input name="source" required placeholder="e.g. Trade show, Nov 2026" className="input" /></label>
              {listSelect}
            </div>
            <SubmitButton pendingText="Checking emails…">Validate &amp; add</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
