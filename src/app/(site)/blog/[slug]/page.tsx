import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { fmtDate } from "@/lib/utils";
import { cleanHtml } from "@/lib/sanitize";
import { JsonLd } from "@/components/site/JsonLd";

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
    <article className="container-x max-w-3xl py-16 lg:py-24">
      <Link href="/blog" className="text-sm text-brand-600">← All insights</Link>
      <p className="mt-6 text-sm font-semibold text-brand-600">{p.category} · {fmtDate(p.publishedAt)}</p>
      <h1 className="h-display mt-3 text-4xl">{p.title}</h1>
      {p.excerpt && <p className="mt-4 text-lg text-ink-500">{p.excerpt}</p>}
      {p.coverImage && <img src={p.coverImage} alt="" className="mt-8 w-full rounded-2xl" />}
      <div className="prose-x mt-10" dangerouslySetInnerHTML={{ __html: cleanHtml(p.body) }} />
      <div className="card mt-12 p-8"><h2 className="font-display text-2xl font-bold">Want help putting this into practice?</h2>
        <p className="mt-2 text-ink-500">Get a free review of your marketing from our team.</p><Link href="/contact" className="btn-primary mt-4">Get a free review</Link></div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(), publisher: { "@type": "Organization", name: "Avrix UK & Europe Business Marketing" } }} />
    </article>
  );
}
