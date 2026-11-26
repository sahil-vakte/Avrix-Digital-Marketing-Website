import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { appScope, inScopeOrShared } from "@/lib/apps";
import { db, t } from "@/db";
import { AppBadge, Badge, Empty, PageHeader, ScopeNote } from "@/components/admin/ui";
import { fmtDate, pct } from "@/lib/utils";

export const metadata = { title: "Campaigns" };

export default async function Campaigns() {
  const user = await requireUser();
  const scope = await appScope(user);
  const rows = await db.select({
    c: t.campaigns,
    recipients: sql<number>`(select count(*)::int from campaign_recipients r where r.campaign_id = ${t.campaigns.id} and r.status <> 'EXCLUDED')`,
    sent: sql<number>`(select count(*)::int from email_messages m where m.campaign_id = ${t.campaigns.id} and m.status in ('SENT','BOUNCED') and m.kind in ('CAMPAIGN','FOLLOW_UP'))`,
    opened: sql<number>`(select count(*)::int from campaign_recipients r where r.campaign_id = ${t.campaigns.id} and r.open_count > 0)`,
    clicked: sql<number>`(select count(*)::int from campaign_recipients r where r.campaign_id = ${t.campaigns.id} and r.click_count > 0)`,
    replied: sql<number>`(select count(*)::int from campaign_recipients r where r.campaign_id = ${t.campaigns.id} and r.replied_at is not null)`,
    reached: sql<number>`(select count(*)::int from campaign_recipients r where r.campaign_id = ${t.campaigns.id} and r.status not in ('EXCLUDED','QUEUED','HELD'))`,
  }).from(t.campaigns).where(inScopeOrShared(t.campaigns.applicationId, scope, user)).orderBy(desc(t.campaigns.createdAt));
  const appOf = (id: string | null) => scope.apps.find((a) => a.id === id);
  return (
    <div>
      <PageHeader title="Campaigns" sub="Personalised email campaigns with follow-ups, sent from your outreach mailbox." actions={<Link href="/admin/campaigns/new" className="btn-primary">New campaign</Link>} />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="table-x"><thead><tr><th>Campaign</th><th>Application</th><th>Status</th><th>Recipients</th><th>Emails sent</th><th>Opened</th><th>Clicked</th><th>Replied</th><th>Created</th></tr></thead><tbody>
            {rows.map(({ c, ...s }) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td><Link href={`/admin/campaigns/${c.id}`} className="font-semibold hover:underline">{c.name}</Link><div className="max-w-xs truncate text-xs text-ink-500">{c.subjectA}{c.subjectB ? " · A/B" : ""}</div></td>
                <td><AppBadge app={appOf(c.applicationId)} /></td>
                <td><Badge>{c.status}</Badge>{c.pauseReason && <div className="max-w-[180px] truncate text-[11px] text-amber-700" title={c.pauseReason}>{c.pauseReason}</div>}</td>
                <td>{s.recipients}</td><td>{s.sent}</td>
                <td>{s.opened} <span className="text-xs text-ink-500">{pct(s.opened, s.reached)}</span></td>
                <td>{s.clicked} <span className="text-xs text-ink-500">{pct(s.clicked, s.reached)}</span></td>
                <td>{s.replied} <span className="text-xs text-ink-500">{pct(s.replied, s.reached)}</span></td>
                <td className="text-xs text-ink-500">{fmtDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ) : <Empty>No campaigns yet. <Link href="/admin/campaigns/new" className="text-brand-600 underline">Create your first one</Link>.</Empty>}
    </div>
  );
}
