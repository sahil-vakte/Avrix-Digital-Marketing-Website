import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { SERVICES } from "@/content/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [posts, cases] = await Promise.all([
    db.select({ slug: t.posts.slug, updatedAt: t.posts.updatedAt }).from(t.posts).where(eq(t.posts.status, "PUBLISHED")),
    db.select({ slug: t.caseStudies.slug, updatedAt: t.caseStudies.updatedAt }).from(t.caseStudies).where(eq(t.caseStudies.status, "PUBLISHED")),
  ]);
  const staticPages = ["", "/about", "/pricing", "/case-studies", "/blog", "/contact", "/privacy", "/cookies", "/terms"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt })),
    ...cases.map((c) => ({ url: `${base}/case-studies/${c.slug}`, lastModified: c.updatedAt })),
  ];
}
