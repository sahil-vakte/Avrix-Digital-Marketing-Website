import { COUNTRIES } from "@/lib/countries";
import type { Contact } from "@/db/schema";

export const BUSINESS_TYPES = [
  ["LIMITED_COMPANY", "Limited company"], ["LLP", "LLP"], ["PLC", "PLC"], ["PUBLIC_BODY", "Public body"],
  ["SOLE_TRADER", "Sole trader"], ["PARTNERSHIP", "Partnership (non-LLP)"], ["UNKNOWN", "Unknown"],
] as const;
export const CONSENT = [["OPTED_IN", "Opted in"], ["LEGITIMATE_INTEREST", "Legitimate interest (corporate)"], ["NONE", "None"]] as const;

export function ContactFields({ c }: { c?: Partial<Contact> }) {
  const custom = Object.entries(c?.customFields ?? {});
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Business name *</span><input name="businessName" required defaultValue={c?.businessName} className="input" /></label>
      <label><span className="label">Website</span><input name="website" defaultValue={c?.website ?? ""} className="input" /></label>
      <label><span className="label">First name</span><input name="firstName" defaultValue={c?.firstName ?? ""} className="input" /></label>
      <label><span className="label">Last name</span><input name="lastName" defaultValue={c?.lastName ?? ""} className="input" /></label>
      <label><span className="label">Job title</span><input name="jobTitle" defaultValue={c?.jobTitle ?? ""} className="input" /></label>
      <label><span className="label">Phone</span><input name="phone" defaultValue={c?.phone ?? ""} className="input" /></label>
      <label><span className="label">City</span><input name="city" defaultValue={c?.city ?? ""} className="input" /></label>
      <label><span className="label">Country *</span><select name="country" defaultValue={c?.country ?? "GB"} className="input">{COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label>
      <label><span className="label">Business type *</span><select name="businessType" defaultValue={c?.businessType ?? "UNKNOWN"} className="input">{BUSINESS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label><span className="label">Consent status *</span><select name="consentStatus" defaultValue={c?.consentStatus ?? "NONE"} className="input">{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label><span className="label">Lawful basis note</span><input name="lawfulBasis" defaultValue={c?.lawfulBasis ?? ""} placeholder="e.g. Consent via website form 12/11/2026" className="input" /></label>
      <label><span className="label">Source *</span><input name="source" required defaultValue={c?.source ?? "Manual entry"} className="input" /></label>
      <label className="sm:col-span-2"><span className="label">Tags (comma separated)</span><input name="tags" defaultValue={(c?.tags ?? []).join(", ")} className="input" /></label>
      <fieldset className="sm:col-span-2"><legend className="label">Custom fields (usable as {"{{custom.name}}"})</legend>
        <div className="space-y-2">{[...custom, ["", ""], ["", ""]].map(([k, v], i) => (
          <div key={i} className="grid grid-cols-2 gap-2"><input name={`cf_key_${i}`} defaultValue={k} placeholder="Field name" className="input" /><input name={`cf_val_${i}`} defaultValue={v} placeholder="Value" className="input" /></div>
        ))}</div>
      </fieldset>
    </div>
  );
}
