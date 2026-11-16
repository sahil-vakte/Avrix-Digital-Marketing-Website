import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { PageHero } from "@/components/site/PageHero";
import { Scene, type SceneKind } from "@/components/site/art/Scene";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Case studies", alternates: { canonical: "/case-studies" } };

const FALLBACK: SceneKind[] = ["chart", "funnel", "rocket", "pipeline", "target", "social"];

export default async function CaseStudies() {
  const items = await db.select().from(t.caseStudies).where(eq(t.caseStudies.status, "PUBLISHED")).orderBy(desc(t.caseStudies.createdAt));
  return (
    <>
      <PageHero eyebrow="Case studies" scene="chart" title={<>Results we've <span className="s-gradient-text">delivered</span></>} lead="How joined-up ads, websites, tracking and follow-up have helped businesses like yours." />
      <section className="s-container pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <Link key={c.id} href={`/case-studies/${c.slug}`} className="s-card s-card-hover group flex flex-col overflow-hidden" data-reveal data-reveal-delay={String((i % 3) * 90)}>
              <div className="overflow-hidden">
                {c.coverImage
                  ? <img src={c.coverImage} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  : <Scene kind={FALLBACK[i % FALLBACK.length]} className="w-full transition duration-500 group-hover:scale-105" />}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-s-primary">{c.industry}</p>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-s-muted">{c.summary}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">{c.results.map((r) => <li key={r} className="rounded-full bg-s-green/10 px-2.5 py-1 text-[11px] font-semibold text-s-green">{r}</li>)}</ul>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-s-primary">Read the story <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
        {!items.length && <div className="s-card p-10 text-center text-s-muted">Case studies coming soon.</div>}
      </section>
    </>
  );
}
