import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, t } from "@/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Case studies", alternates: { canonical: "/case-studies" } };

export default async function CaseStudies() {
  const items = await db.select().from(t.caseStudies).where(eq(t.caseStudies.status, "PUBLISHED")).orderBy(desc(t.caseStudies.createdAt));
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">Case studies</p><h1 className="h-display mt-3 text-4xl sm:text-5xl">Results we've delivered</h1>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link key={c.id} href={`/case-studies/${c.slug}`} className="card overflow-hidden transition hover:shadow-lg">
            {c.coverImage ? <img src={c.coverImage} alt="" className="h-44 w-full object-cover" /> : <div className="h-44 bg-gradient-to-br from-brand-500 to-brand-800" />}
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{c.industry}</p>
              <h2 className="mt-2 font-display text-lg font-bold">{c.title}</h2>
              <p className="mt-2 text-sm text-ink-500">{c.summary}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">{c.results.map((r) => <li key={r} className="badge bg-green-50 text-green-700">{r}</li>)}</ul>
            </div>
          </Link>
        ))}
        {!items.length && <p className="text-ink-500">Case studies coming soon.</p>}
      </div>
    </div>
  );
}
