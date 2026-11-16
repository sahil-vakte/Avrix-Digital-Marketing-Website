import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, t } from "@/db";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Website content" };

export default async function Content() {
  const [[p], [c], [f], [pr]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(t.posts), db.select({ n: sql<number>`count(*)::int` }).from(t.caseStudies),
    db.select({ n: sql<number>`count(*)::int` }).from(t.faqs), db.select({ n: sql<number>`count(*)::int` }).from(t.pricingPlans),
  ]);
  const items = [
    { href: "/admin/content/posts", title: "Blog posts", n: p.n, text: "Articles on the Insights page." },
    { href: "/admin/content/case-studies", title: "Case studies", n: c.n, text: "Client results and stories." },
    { href: "/admin/content/faqs", title: "FAQs", n: f.n, text: "Questions on the home and pricing pages." },
    { href: "/admin/content/pricing", title: "Pricing plans", n: pr.n, text: "Plans and prices in GBP and EUR." },
  ];
  return (
    <div>
      <PageHeader title="Website content" sub="Service pages and home-page copy live in src/content/site.ts; everything here is editable without a deploy." actions={<a href="/" target="_blank" className="btn-ghost">View website</a>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{items.map((i) => (
        <Link key={i.href} href={i.href} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-300"><p className="font-display text-3xl font-extrabold">{i.n}</p><p className="mt-1 font-semibold">{i.title}</p><p className="text-sm text-ink-500">{i.text}</p></Link>
      ))}</div>
    </div>
  );
}
