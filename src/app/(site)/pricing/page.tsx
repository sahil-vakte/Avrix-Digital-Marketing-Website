import type { Metadata } from "next";
import { asc, eq, and } from "drizzle-orm";
import { db, t } from "@/db";
import { PricingTable } from "@/components/site/PricingTable";
import { Faq } from "@/components/site/Faq";
import { PageHero } from "@/components/site/PageHero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing", description: "Simple monthly marketing plans for SMEs, priced in GBP and EUR.", alternates: { canonical: "/pricing" } };

export default async function Pricing() {
  const [plans, faqs] = await Promise.all([
    db.select().from(t.pricingPlans).where(eq(t.pricingPlans.active, true)).orderBy(asc(t.pricingPlans.order)),
    db.select().from(t.faqs).where(and(eq(t.faqs.active, true))).orderBy(asc(t.faqs.order)),
  ]);
  return (
    <>
      <PageHero center eyebrow="Pricing" title={<>Plans that <span className="s-gradient-text">grow with you</span></>}
        lead="All prices exclude VAT and advertising spend. Switch between pounds and euros below." />
      <section className="s-container pb-20">
        <PricingTable plans={plans.map((p) => ({ ...p, priceGbp: String(p.priceGbp), priceEur: String(p.priceEur) }))} />
      </section>
      <section className="bg-s-soft py-20">
        <div className="s-container max-w-3xl">
          <h2 className="s-h2 text-center" data-reveal>Frequently asked questions</h2>
          <div className="mt-10" data-reveal><Faq items={faqs} /></div>
        </div>
      </section>
    </>
  );
}
