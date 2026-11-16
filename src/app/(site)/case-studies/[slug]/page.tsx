import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { cleanHtml } from "@/lib/sanitize";

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
    <article className="container-x max-w-3xl py-16 lg:py-24">
      <Link href="/case-studies" className="text-sm text-brand-600">← All case studies</Link>
      <p className="eyebrow mt-6">{c.client} · {c.industry}</p>
      <h1 className="h-display mt-3 text-4xl">{c.title}</h1>
      <p className="mt-4 text-lg text-ink-500">{c.summary}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">{c.results.map((r) => <div key={r} className="card p-5 font-display text-lg font-bold text-brand-700">{r}</div>)}</div>
      <div className="prose-x mt-10" dangerouslySetInnerHTML={{ __html: cleanHtml(c.body) }} />
      <Link href="/contact" className="btn-primary mt-10">Get results like these</Link>
    </article>
  );
}
