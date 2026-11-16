import type { Metadata } from "next";
import { asc, eq, and } from "drizzle-orm";
import { db, t } from "@/db";
import { PricingTable } from "@/components/site/PricingTable";
import { Faq } from "@/components/site/Faq";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "Simple monthly marketing plans for SMEs, priced in GBP and EUR.", alternates: { canonical: "/pricing" } };

export default async function Pricing() {
  const [plans, faqs] = await Promise.all([
    db.select().from(t.pricingPlans).where(eq(t.pricingPlans.active, true)).orderBy(asc(t.pricingPlans.order)),
    db.select().from(t.faqs).where(and(eq(t.faqs.active, true))).orderBy(asc(t.faqs.order)),
  ]);
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Pricing</p><h1 className="h-display mt-3 text-4xl sm:text-5xl">Plans that grow with you</h1>
        <p className="mt-4 text-ink-500">All prices exclude VAT and advertising spend. Switch between pounds and euros below.</p></div>
      <div className="mt-12"><PricingTable plans={plans.map((p) => ({ ...p, priceGbp: String(p.priceGbp), priceEur: String(p.priceEur) }))} /></div>
      <div className="mx-auto mt-20 max-w-3xl"><h2 className="h-display text-3xl">Frequently asked questions</h2><div className="mt-6"><Faq items={faqs} /></div></div>
    </div>
  );
}
