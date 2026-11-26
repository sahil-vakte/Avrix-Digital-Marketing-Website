import { COUNTRIES } from "@/lib/countries";
import { SERVICES } from "@/content/site";

type L = { name?: string; businessName?: string | null; email?: string; phone?: string | null; country?: string | null; service?: string | null; budget?: string | null; value?: string | null; currency?: string; ownerId?: string | null; tags?: string[]; priority?: string };

export function LeadFields({ lead = {}, users }: { lead?: L; users: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Name *</span><input name="name" required defaultValue={lead.name} className="input" /></label>
      <label><span className="label">Business</span><input name="businessName" defaultValue={lead.businessName ?? ""} className="input" /></label>
      <label><span className="label">Email *</span><input name="email" type="email" required defaultValue={lead.email} className="input" /></label>
      <label><span className="label">Phone</span><input name="phone" defaultValue={lead.phone ?? ""} className="input" /></label>
      <label><span className="label">Country</span><select name="country" defaultValue={lead.country ?? "GB"} className="input">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label><span className="label">Service interest</span><select name="service" defaultValue={lead.service ?? ""} className="input"><option value="">—</option>{SERVICES.map((s) => <option key={s.slug}>{s.title}</option>)}</select></label>
      <label><span className="label">Budget</span><input name="budget" defaultValue={lead.budget ?? ""} className="input" /></label>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <label><span className="label">Est. deal value</span><input name="value" type="number" step="0.01" min="0" defaultValue={lead.value ?? ""} className="input" /></label>
        <label><span className="label">Currency</span><select name="currency" defaultValue={lead.currency ?? "GBP"} className="input"><option>GBP</option><option>EUR</option></select></label>
      </div>
      <label><span className="label">Owner</span><select name="ownerId" defaultValue={lead.ownerId ?? ""} className="input"><option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label><span className="label">Priority</span><select name="priority" defaultValue={lead.priority ?? "normal"} className="input"><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
      <label><span className="label">Tags (comma separated)</span><input name="tags" defaultValue={(lead.tags ?? []).join(", ")} className="input" /></label>
    </div>
  );
}
