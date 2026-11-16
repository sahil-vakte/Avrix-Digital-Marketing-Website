import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Insights", description: "Practical marketing advice for UK and European SMEs.", alternates: { canonical: "/blog" } };

export default async function Blog({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const all = await db.select().from(t.posts).where(eq(t.posts.status, "PUBLISHED")).orderBy(desc(t.posts.publishedAt));
  const cats = [...new Set(all.map((p) => p.category).filter(Boolean))] as string[];
  const posts = category ? all.filter((p) => p.category === category) : all;
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">Insights</p><h1 className="h-display mt-3 text-4xl sm:text-5xl">Marketing advice that pays for itself</h1>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/blog" className={`rounded-full border px-4 py-1.5 text-sm ${!category ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200"}`}>All</Link>
        {cats.map((c) => <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className={`rounded-full border px-4 py-1.5 text-sm ${category === c ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200"}`}>{c}</Link>)}
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden transition hover:shadow-lg">
            {p.coverImage ? <img src={p.coverImage} alt="" className="h-44 w-full object-cover" /> : <div className="h-44 bg-gradient-to-br from-brand-100 to-brand-300" />}
            <div className="p-6"><p className="text-xs font-semibold text-brand-600">{p.category} · {fmtDate(p.publishedAt)}</p>
              <h2 className="mt-2 font-display text-lg font-bold">{p.title}</h2><p className="mt-2 text-sm text-ink-500">{p.excerpt}</p></div>
          </Link>
        ))}
        {!posts.length && <p className="text-ink-500">No articles yet.</p>}
      </div>
    </div>
  );
}
