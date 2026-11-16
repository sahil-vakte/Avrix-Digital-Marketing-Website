import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { cleanHtml } from "@/lib/sanitize";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

async function get(slug: string) {
  return db.query.caseStudies.findFirst({ where: and(eq(t.caseStudies.slug, slug), eq(t.caseStudies.status, "PUBLISHED")) });
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await get((await params).slug);
  return c ? { title: c.title, description: c.summary, alternates: { canonical: `/case-studies/${c.slug}` } } : {};
}

export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const c = await get((await params).slug);
  if (!c) notFound();
  return (
    <article className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#2563eb]/10 to-transparent" />
      <div className="s-container relative max-w-3xl py-16 lg:py-20">
        <Link href="/case-studies" className="inline-flex items-center gap-1.5 text-sm font-medium text-s-muted transition hover:text-s-primary"><Icon name="arrow" className="h-4 w-4 rotate-180" /> All case studies</Link>
        <p className="s-eyebrow mt-8">{c.client} · {c.industry}</p>
        <h1 className="s-h1 mt-4 text-4xl sm:text-5xl lg:text-5xl">{c.title}</h1>
        <p className="s-lead mt-5">{c.summary}</p>
        {c.coverImage && <img src={c.coverImage} alt="" className="mt-10 w-full rounded-3xl shadow-glow" />}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {c.results.map((r) => (
            <div key={r} className="s-dark rounded-2xl border border-white/10 bg-gradient-to-br from-navy-900 to-navy-800 p-5" data-reveal>
              <Icon name="chart" className="h-5 w-5 text-s-cyan" />
              <p className="mt-3 font-display text-lg font-bold text-white">{r}</p>
            </div>
          ))}
        </div>
        <div className="s-prose mt-12" dangerouslySetInnerHTML={{ __html: cleanHtml(c.body) }} />
        <Link href="/contact" className="s-btn-primary mt-10">Get results like these <Icon name="arrow" className="h-4 w-4" /></Link>
      </div>
    </article>
  );
}
