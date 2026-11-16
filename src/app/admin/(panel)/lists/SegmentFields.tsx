import type { SegmentRules } from "@/db/schema";
import { COUNTRIES } from "@/lib/countries";
import { BUSINESS_TYPES, CONSENT } from "../contacts/ContactFields";

export function SegmentFields({ r = {} }: { r?: SegmentRules }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Countries (none = all)</span><select name="countries" multiple defaultValue={r.countries ?? []} className="input h-32">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label><span className="label">Business types (none = all)</span><select name="businessTypes" multiple defaultValue={r.businessTypes ?? []} className="input h-32">{BUSINESS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label><span className="label">Consent (none = all)</span><select name="consentStatuses" multiple defaultValue={r.consentStatuses ?? []} className="input h-24">{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <div className="space-y-3">
        <label className="block"><span className="label">Has any of these tags</span><input name="tags" defaultValue={(r.tags ?? []).join(", ")} className="input" /></label>
        <label className="block"><span className="label">Not emailed in the last … days</span><input name="notEmailedDays" type="number" min="0" defaultValue={r.notEmailedDays ?? ""} className="input" /></label>
        <label className="block"><span className="label">Text contains</span><input name="search" defaultValue={r.search ?? ""} className="input" /></label>
      </div>
      <p className="text-xs text-ink-500 sm:col-span-2">Hold Ctrl / Cmd to select several. Segments update automatically as contacts change.</p>
    </div>
  );
}
