"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { slugify, str, strOrNull } from "@/lib/utils";

export async function savePost(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const status = fd.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const v = {
    title: str(fd.get("title")), slug: slugify(str(fd.get("slug")) || str(fd.get("title"))), excerpt: strOrNull(fd.get("excerpt")), body: String(fd.get("body") ?? ""),
    category: strOrNull(fd.get("category")), coverImage: strOrNull(fd.get("coverImage")), seoTitle: strOrNull(fd.get("seoTitle")), seoDesc: strOrNull(fd.get("seoDesc")), status,
  } as const;
  let postId = id;
  if (id) {
    const prev = await db.query.posts.findFirst({ where: eq(t.posts.id, id) });
    await db.update(t.posts).set({ ...v, publishedAt: status === "PUBLISHED" ? prev?.publishedAt ?? new Date() : prev?.publishedAt ?? null }).where(eq(t.posts.id, id));
  } else {
    const [p] = await db.insert(t.posts).values({ ...v, publishedAt: status === "PUBLISHED" ? new Date() : null }).returning();
    postId = p.id;
  }
  await audit(user.id, "save", "post", postId);
  revalidatePath("/blog");
  redirect(`/admin/content/posts/${postId}?ok=Saved`);
}

export async function deletePost(fd: FormData) {
  await requireUser();
  await db.delete(t.posts).where(eq(t.posts.id, str(fd.get("id"))));
  redirect("/admin/content/posts");
}

export async function saveCase(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  const v = {
    title: str(fd.get("title")), slug: slugify(str(fd.get("slug")) || str(fd.get("title"))), client: str(fd.get("client")), industry: strOrNull(fd.get("industry")),
    summary: str(fd.get("summary")), body: String(fd.get("body") ?? ""), coverImage: strOrNull(fd.get("coverImage")),
    results: str(fd.get("results")).split("\n").map((s) => s.trim()).filter(Boolean), status: (fd.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as "PUBLISHED" | "DRAFT",
  };
  let cid = id;
  if (id) await db.update(t.caseStudies).set(v).where(eq(t.caseStudies.id, id));
  else cid = (await db.insert(t.caseStudies).values(v).returning())[0].id;
  redirect(`/admin/content/case-studies/${cid}?ok=Saved`);
}

export async function deleteCase(fd: FormData) {
  await requireUser();
  await db.delete(t.caseStudies).where(eq(t.caseStudies.id, str(fd.get("id"))));
  redirect("/admin/content/case-studies");
}

export async function saveFaq(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  const v = { question: str(fd.get("question")), answer: str(fd.get("answer")), order: Number(fd.get("order") || 0), page: str(fd.get("page")) || "home", active: fd.get("active") === "on" };
  if (fd.get("delete") === "1" && id) await db.delete(t.faqs).where(eq(t.faqs.id, id));
  else if (id) await db.update(t.faqs).set(v).where(eq(t.faqs.id, id));
  else if (v.question) await db.insert(t.faqs).values(v);
  revalidatePath("/admin/content/faqs");
  revalidatePath("/");
}

export async function savePlan(fd: FormData) {
  await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const v = {
    name: str(fd.get("name")), tagline: strOrNull(fd.get("tagline")), priceGbp: str(fd.get("priceGbp")) || "0", priceEur: str(fd.get("priceEur")) || "0",
    period: str(fd.get("period")) || "month", features: str(fd.get("features")).split("\n").map((s) => s.trim()).filter(Boolean),
    highlight: fd.get("highlight") === "on", order: Number(fd.get("order") || 0), active: fd.get("active") === "on",
  };
  if (fd.get("delete") === "1" && id) await db.delete(t.pricingPlans).where(eq(t.pricingPlans.id, id));
  else if (id) await db.update(t.pricingPlans).set(v).where(eq(t.pricingPlans.id, id));
  else if (v.name) await db.insert(t.pricingPlans).values(v);
  revalidatePath("/admin/content/pricing");
  revalidatePath("/pricing");
}
