import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { savePlan } from "../actions";

export const metadata = { title: "Pricing plans" };

export default async function Pricing() {
  const rows = await db.select().from(t.pricingPlans).orderBy(asc(t.pricingPlans.order));
  const Form = ({ p }: { p?: typeof rows[number] }) => (
    <form action={savePlan} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-4">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <label><span className="label">Name</span><input name="name" required defaultValue={p?.name} className="input" /></label>
      <label><span className="label">Price £ (GBP)</span><input name="priceGbp" type="number" step="0.01" required defaultValue={p?.priceGbp} className="input" /></label>
      <label><span className="label">Price € (EUR)</span><input name="priceEur" type="number" step="0.01" required defaultValue={p?.priceEur} className="input" /></label>
      <label><span className="label">Billing</span><select name="period" defaultValue={p?.period ?? "month"} className="input"><option value="month">Per month</option><option value="one-off">One-off</option></select></label>
      <label className="md:col-span-2"><span className="label">Tagline</span><input name="tagline" defaultValue={p?.tagline ?? ""} className="input" /></label>
      <label className="md:col-span-2 md:row-span-2"><span className="label">Features (one per line)</span><textarea name="features" rows={4} defaultValue={(p?.features ?? []).join("\n")} className="input" /></label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <label className="flex items-center gap-1 text-sm">Order <input name="order" type="number" defaultValue={p?.order ?? rows.length + 1} className="input w-16" /></label>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="highlight" defaultChecked={p?.highlight} /> Most popular</label>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Show</label>
        <SubmitButton className="btn-ghost btn-sm">{p ? "Save" : "Add plan"}</SubmitButton>{p && <SubmitButton className="btn-ghost btn-sm text-red-600" name="delete" value="1">Delete</SubmitButton>}
      </div>
    </form>
  );
  return (
    <div className="max-w-5xl">
      <PageHeader title="Pricing plans" sub="Shown on the home and pricing pages with a GBP/EUR switch. Admin only." actions={<Link href="/admin/content" className="btn-ghost">Back</Link>} />
      <div className="space-y-4">{rows.map((p) => <Form key={p.id} p={p} />)}</div>
      <Card title="Add a plan" className="mt-6"><Form /></Card>
    </div>
  );
}
