import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { fmtDate } from "@/lib/utils";
import { PageHero } from "@/components/site/PageHero";
import { Scene, type SceneKind } from "@/components/site/art/Scene";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Insights", description: "Practical marketing advice for UK and European SMEs.", alternates: { canonical: "/blog" } };

const FALLBACK: SceneKind[] = ["chart", "search", "document", "megaphone", "funnel", "chat"];

export default async function Blog({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const all = await db.select().from(t.posts).where(eq(t.posts.status, "PUBLISHED")).orderBy(desc(t.posts.publishedAt));
  const cats = [...new Set(all.map((p) => p.category).filter(Boolean))] as string[];
  const posts = category ? all.filter((p) => p.category === category) : all;
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-transparent bg-gradient-to-r from-[#2563eb] to-[#4f7cff] text-white shadow-glow" : "border-s-line bg-s-surface text-s-muted hover:border-s-primary/50 hover:text-s-fg"}`;
  return (
    <>
      <PageHero eyebrow="Insights" title={<>Marketing advice that <span className="s-gradient-text">pays for itself</span></>} lead="Practical guides on ads, websites, tracking and follow-up for UK and European SMEs." />
      <section className="s-container pb-24">
        <div className="flex flex-wrap gap-2" data-reveal>
          <Link href="/blog" className={chip(!category)}>All</Link>
          {cats.map((c) => <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className={chip(category === c)}>{c}</Link>)}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="s-card s-card-hover group flex flex-col overflow-hidden" data-reveal data-reveal-delay={String((i % 3) * 90)}>
              <div className="overflow-hidden">
                {p.coverImage
                  ? <img src={p.coverImage} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  : <Scene kind={FALLBACK[i % FALLBACK.length]} className="w-full transition duration-500 group-hover:scale-105" />}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold text-s-primary">{p.category} · {fmtDate(p.publishedAt)}</p>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug">{p.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-s-muted">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-s-primary">Read article <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
        {!posts.length && <div className="s-card mt-6 p-10 text-center text-s-muted">No articles yet — check back soon.</div>}
      </section>
    </>
  );
}
