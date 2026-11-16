import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { saveCountry } from "../actions";

export const metadata = { title: "Country rules" };

export default async function Countries() {
  await requireUser({ admin: true });
  const rows = await db.select().from(t.countryRules).orderBy(asc(t.countryRules.name));
  return (
    <div className="max-w-5xl">
      <PageHeader title="Country rules" sub="When “consent required” is ticked, contacts in that country are only emailed if they have opted in — even companies." actions={<Link href="/admin/settings" className="btn-ghost">Back</Link>} />
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">The defaults are conservative starting points, not legal advice. Several EU countries (e.g. Germany, Austria, Italy, Poland) require prior consent for most B2B marketing email. Confirm each target market with your legal adviser.</p>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table className="table-x"><thead><tr><th>Country</th><th>Consent required</th><th>Time zone (for send windows)</th><th>Note</th><th /></tr></thead><tbody>
        {rows.map((r) => (
          <tr key={r.countryCode}><td colSpan={5} className="p-0">
            <form action={saveCountry} className="grid grid-cols-[180px_140px_200px_1fr_80px] items-center gap-2 px-3 py-2">
              <input type="hidden" name="countryCode" value={r.countryCode} /><input type="hidden" name="name" value={r.name} />
              <span className="text-sm">{r.name} <span className="text-xs text-ink-500">{r.countryCode}</span></span>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="consentRequired" defaultChecked={r.consentRequired} /> Required</label>
              <input name="timezone" defaultValue={r.timezone} className="input" />
              <input name="note" defaultValue={r.note ?? ""} placeholder="Note" className="input" />
              <SubmitButton className="btn-ghost btn-sm">Save</SubmitButton>
            </form>
          </td></tr>
        ))}
      </tbody></table></div>
    </div>
  );
}
