import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { canSeeApplication } from "@/lib/apps";
import { requireUser } from "@/lib/auth";
import { Flash, PageHeader } from "@/components/admin/ui";
import { Builder } from "./Builder";
import { Report } from "./Report";

export const metadata = { title: "Campaign" };

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id) });
  if (!c || !(await canSeeApplication(user, c.applicationId))) notFound();
  const draft = c.status === "DRAFT" || c.status === "PENDING_APPROVAL";
  return (
    <div>
      <PageHeader title={c.name} sub={draft ? (c.status === "PENDING_APPROVAL" ? "Waiting for approval" : "Draft — set up your campaign below") : `Subject: ${c.subjectA}`} actions={<Link href="/admin/campaigns" className="btn-ghost">All campaigns</Link>} />
      <Flash ok={sp.ok} error={sp.error} />
      {draft ? <Builder c={c} role={user.role} userEmail={user.email} previewContact={sp.previewContact} /> : <Report c={c} sp={sp} />}
    </div>
  );
}
