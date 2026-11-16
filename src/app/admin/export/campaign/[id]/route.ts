import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Unauthorised", { status: 401 });
  const id = (await params).id;
  const c = await db.query.campaigns.findFirst({ where: eq(t.campaigns.id, id) });
  if (!c) return new Response("Not found", { status: 404 });
  const rows = await db.query.campaignRecipients.findMany({ where: eq(t.campaignRecipients.campaignId, id), with: { contact: true }, orderBy: asc(t.campaignRecipients.email) });
  const csv = toCsv([
    ["Email", "Business", "First name", "Country", "Status", "Excluded reason", "Variant", "Opens", "Clicks", "First opened", "Last opened", "Replied at", "Reply", "Bounced at", "Unsubscribed at"],
    ...rows.map((r) => [r.email, r.contact?.businessName, r.contact?.firstName, r.contact?.country, r.status, r.excludeReason, r.variant, r.openCount, r.clickCount, r.firstOpenAt, r.lastOpenAt, r.repliedAt, r.replySnippet, r.bouncedAt, r.unsubscribedAt]),
  ]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="campaign-${c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv"` } });
}
