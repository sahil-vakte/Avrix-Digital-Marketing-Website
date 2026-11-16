import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { fmtDate } from "@/lib/utils";
import { cleanHtml } from "@/lib/sanitize";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
const get = (slug: string) => db.query.posts.findFirst({ where: and(eq(t.posts.slug, slug), eq(t.posts.status, "PUBLISHED")) });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await get((await params).slug);
  return p ? { title: p.seoTitle || p.title, description: p.seoDesc || p.excerpt || undefined, alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, images: p.coverImage ? [p.coverImage] : undefined } } : {};
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await get((await params).slug);
  if (!p) notFound();
  return (
    <article className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#2563eb]/10 to-transparent" />
      <div className="s-container relative max-w-3xl py-16 lg:py-20">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-s-muted transition hover:text-s-primary"><Icon name="arrow" className="h-4 w-4 rotate-180" /> All insights</Link>
        <p className="mt-8 inline-flex rounded-full bg-s-primary/10 px-3 py-1 text-xs font-semibold text-s-primary">{p.category} · {fmtDate(p.publishedAt)}</p>
        <h1 className="s-h1 mt-4 text-4xl sm:text-5xl lg:text-5xl">{p.title}</h1>
        {p.excerpt && <p className="s-lead mt-5">{p.excerpt}</p>}
        {p.coverImage && <img src={p.coverImage} alt="" className="mt-10 w-full rounded-3xl shadow-glow" />}
        <div className="s-prose mt-12" dangerouslySetInnerHTML={{ __html: cleanHtml(p.body) }} />
        <div className="s-dark relative mt-14 overflow-hidden rounded-3xl border border-white/10 bg-navy-900 p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2563eb]/35 blur-3xl" />
          <h2 className="relative font-display text-2xl font-bold text-white">Want help putting this into practice?</h2>
          <p className="relative mt-2 text-s-muted">Get a free review of your marketing from our team.</p>
          <Link href="/contact" className="s-btn-light relative mt-6">Get a free review <Icon name="arrow" className="h-4 w-4" /></Link>
        </div>
      </div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(), publisher: { "@type": "Organization", name: "Avrix UK & Europe Business Marketing" } }} />
    </article>
  );
}
