import Link from "next/link";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db, t } from "@/db";
import type { Campaign } from "@/db/schema";
import { Badge, Card, Pagination, Stat } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { fmtDate, pct } from "@/lib/utils";
import { deleteCampaign, duplicateCampaign, setCampaignStatus } from "../actions";

const PER = 50;
const FILTERS = ["all", "opened", "clicked", "replied", "bounced", "unsubscribed", "excluded", "queued"] as const;

export async function Report({ c, sp }: { c: Campaign; sp: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(sp.page ?? 1));
  const filter = (FILTERS as readonly string[]).includes(sp.f ?? "") ? sp.f! : "all";
  const [stats] = await db.select({
    total: sql<number>`count(*) filter (where ${t.campaignRecipients.status} <> 'EXCLUDED')::int`,
    excluded: sql<number>`count(*) filter (where ${t.campaignRecipients.status} = 'EXCLUDED')::int`,
    reached: sql<number>`count(*) filter (where ${t.campaignRecipients.status} not in ('EXCLUDED','QUEUED','HELD'))::int`,
    opened: sql<number>`count(*) filter (where ${t.campaignRecipients.openCount} > 0)::int`,
    totalOpens: sql<number>`coalesce(sum(${t.campaignRecipients.openCount}),0)::int`,
    clicked: sql<number>`count(*) filter (where ${t.campaignRecipients.clickCount} > 0)::int`,
    replied: sql<number>`count(*) filter (where ${t.campaignRecipients.repliedAt} is not null)::int`,
    bounced: sql<number>`count(*) filter (where ${t.campaignRecipients.status} = 'BOUNCED')::int`,
    unsub: sql<number>`count(*) filter (where ${t.campaignRecipients.status} = 'UNSUBSCRIBED')::int`,
  }).from(t.campaignRecipients).where(eq(t.campaignRecipients.campaignId, c.id));
  const [msg] = await db.select({
    sent: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('SENT','BOUNCED'))::int`,
    queued: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('QUEUED','SENDING'))::int`,
    failed: sql<number>`count(*) filter (where ${t.emailMessages.status} = 'FAILED')::int`,
    nextAt: sql<Date | null>`min(${t.emailMessages.scheduledFor}) filter (where ${t.emailMessages.status} = 'QUEUED')`,
  }).from(t.emailMessages).where(and(eq(t.emailMessages.campaignId, c.id), sql`${t.emailMessages.kind} in ('CAMPAIGN','FOLLOW_UP')`));
  const bySteps = await db.select({ step: t.emailMessages.stepOrder, sent: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('SENT','BOUNCED'))::int`, queued: sql<number>`count(*) filter (where ${t.emailMessages.status} = 'QUEUED')::int`, opened: sql<number>`count(*) filter (where ${t.emailMessages.openCount} > 0)::int` })
    .from(t.emailMessages).where(and(eq(t.emailMessages.campaignId, c.id), sql`${t.emailMessages.kind} in ('CAMPAIGN','FOLLOW_UP')`)).groupBy(t.emailMessages.stepOrder).orderBy(asc(t.emailMessages.stepOrder));
  const variants = c.subjectB ? await db.select({ v: t.campaignRecipients.variant, n: sql<number>`count(*)::int`, opened: sql<number>`count(*) filter (where ${t.campaignRecipients.openCount} > 0)::int`, replied: sql<number>`count(*) filter (where ${t.campaignRecipients.repliedAt} is not null)::int` })
    .from(t.campaignRecipients).where(and(eq(t.campaignRecipients.campaignId, c.id), sql`${t.campaignRecipients.variant} is not null`)).groupBy(t.campaignRecipients.variant) : [];
  const links = await db.select({ url: t.links.url, clicks: sql<number>`count(${t.emailEvents.id}) filter (where not ${t.emailEvents.machine})::int`, people: sql<number>`count(distinct ${t.emailEvents.recipientId}) filter (where not ${t.emailEvents.machine})::int` })
    .from(t.links).leftJoin(t.emailEvents, eq(t.emailEvents.linkId, t.links.id)).where(eq(t.links.campaignId, c.id)).groupBy(t.links.id).orderBy(desc(sql`2`));
  const daily = await db.select({ day: sql<string>`to_char(date_trunc('day', ${t.emailEvents.createdAt} at time zone 'Europe/London'), 'YYYY-MM-DD')`, type: t.emailEvents.type, n: sql<number>`count(*)::int` })
    .from(t.emailEvents).innerJoin(t.campaignRecipients, eq(t.campaignRecipients.id, t.emailEvents.recipientId))
    .where(and(eq(t.campaignRecipients.campaignId, c.id), eq(t.emailEvents.machine, false), sql`${t.emailEvents.type} in ('SENT','OPEN','CLICK','REPLY')`)).groupBy(sql`1`, t.emailEvents.type).orderBy(sql`1`);
  const hourly = await db.select({ h: sql<number>`extract(hour from ${t.emailEvents.createdAt} at time zone 'Europe/London')::int`, n: sql<number>`count(*)::int` })
    .from(t.emailEvents).innerJoin(t.campaignRecipients, eq(t.campaignRecipients.id, t.emailEvents.recipientId))
    .where(and(eq(t.campaignRecipients.campaignId, c.id), eq(t.emailEvents.type, "OPEN"), eq(t.emailEvents.machine, false))).groupBy(sql`1`);

  const conds: SQL[] = [eq(t.campaignRecipients.campaignId, c.id)];
  if (filter === "opened") conds.push(sql`${t.campaignRecipients.openCount} > 0`);
  if (filter === "clicked") conds.push(sql`${t.campaignRecipients.clickCount} > 0`);
  if (filter === "replied") conds.push(sql`${t.campaignRecipients.repliedAt} is not null`);
  if (filter === "bounced") conds.push(eq(t.campaignRecipients.status, "BOUNCED"));
  if (filter === "unsubscribed") conds.push(eq(t.campaignRecipients.status, "UNSUBSCRIBED"));
  if (filter === "excluded") conds.push(eq(t.campaignRecipients.status, "EXCLUDED"));
  if (filter === "queued") conds.push(sql`${t.campaignRecipients.status} in ('QUEUED','HELD')`);
  if (sp.q) conds.push(ilike(t.campaignRecipients.email, `%${sp.q}%`));
  const where = and(...conds);
  const [recips, [{ n: rn }]] = await Promise.all([
    db.query.campaignRecipients.findMany({ where, with: { contact: true }, orderBy: [desc(t.campaignRecipients.repliedAt), desc(t.campaignRecipients.lastOpenAt), asc(t.campaignRecipients.email)], limit: PER, offset: (page - 1) * PER }),
    db.select({ n: sql<number>`count(*)::int` }).from(t.campaignRecipients).where(where),
  ]);

  const days = [...new Set(daily.map((d) => d.day))];
  const series = (type: string) => days.map((d) => daily.find((x) => x.day === d && x.type === type)?.n ?? 0);
  const maxDay = Math.max(1, ...daily.map((d) => d.n));
  const maxHour = Math.max(1, ...hourly.map((h) => h.n));
  const base = `/admin/campaigns/${c.id}?`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{c.status}</Badge>
        {c.pauseReason && <span className="text-sm text-amber-700">{c.pauseReason}</span>}
        {msg.queued > 0 && <span className="text-sm text-ink-500">{msg.queued} email(s) queued{msg.nextAt ? `, next due ${fmtDate(msg.nextAt, true)}` : ""}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {["SENDING", "SCHEDULED"].includes(c.status) && <form action={setCampaignStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="pause" /><SubmitButton className="btn-ghost">Pause</SubmitButton></form>}
          {c.status === "PAUSED" && <form action={setCampaignStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="resume" /><SubmitButton>Resume</SubmitButton></form>}
          {!["COMPLETED", "CANCELLED"].includes(c.status) && <form action={setCampaignStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="cancel" /><ConfirmButton className="btn-ghost" message="Cancel this campaign? Queued emails and follow-ups will not be sent.">Cancel</ConfirmButton></form>}
          <form action={duplicateCampaign}><input type="hidden" name="id" value={c.id} /><SubmitButton className="btn-ghost">Duplicate</SubmitButton></form>
          <a href={`/admin/export/campaign/${c.id}`} className="btn-ghost">Export CSV</a>
          {["COMPLETED", "CANCELLED"].includes(c.status) && <form action={deleteCampaign}><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Delete this campaign and its statistics?">Delete</ConfirmButton></form>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Recipients" value={stats.total} sub={`${stats.excluded} excluded`} />
        <Stat label="Emails sent" value={msg.sent} sub={msg.failed ? `${msg.failed} failed` : `${msg.queued} queued`} />
        <Stat label="Opened" value={pct(stats.opened, stats.reached)} sub={`${stats.opened} people · ${stats.totalOpens} opens`} />
        <Stat label="Clicked" value={pct(stats.clicked, stats.reached)} sub={`${stats.clicked} people`} />
        <Stat label="Replied" value={pct(stats.replied, stats.reached)} sub={`${stats.replied} people`} tone="good" />
        <Stat label="Bounced / unsub." value={`${pct(stats.bounced, stats.reached)} / ${pct(stats.unsub, stats.reached)}`} sub={`${stats.bounced} / ${stats.unsub}`} tone={stats.reached && stats.bounced / stats.reached > 0.03 ? "bad" : undefined} />
      </div>
      <p className="text-xs text-ink-500">Opens exclude automatic image loads detected within 60 seconds of sending (Apple Mail Privacy Protection, security scanners). Clicks and replies are the most reliable measures.</p>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Activity by day (UK time)" className="xl:col-span-2">
          {days.length ? (
            <div>
              <div className="flex h-48 items-end gap-2">
                {days.map((d, i) => (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-40 w-full items-end justify-center gap-0.5">
                      {[["SENT", "#cbd5e1"], ["OPEN", "#3563f2"], ["CLICK", "#ff9f1c"], ["REPLY", "#16a34a"]].map(([ty, col]) => {
                        const v = series(ty)[i];
                        return <div key={ty} title={`${ty.toLowerCase()}: ${v}`} style={{ height: `${(v / maxDay) * 100}%`, background: col }} className="w-2.5 rounded-t" />;
                      })}
                    </div>
                    <span className="text-[10px] text-ink-500">{d.slice(5)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs">{[["Sent", "#cbd5e1"], ["Opens", "#3563f2"], ["Clicks", "#ff9f1c"], ["Replies", "#16a34a"]].map(([l, c2]) => <span key={l} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded" style={{ background: c2 }} />{l}</span>)}</div>
            </div>
          ) : <p className="text-sm text-ink-500">No activity yet.</p>}
        </Card>
        <Card title="Opens by hour (UK)">
          <div className="flex h-40 items-end gap-0.5">{Array.from({ length: 24 }, (_, h) => { const v = hourly.find((x) => x.h === h)?.n ?? 0; return <div key={h} title={`${h}:00 — ${v}`} className="flex-1 rounded-t bg-brand-500" style={{ height: `${(v / maxHour) * 100}%`, minHeight: v ? 2 : 0 }} />; })}</div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-500"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
        </Card>
        <Card title="By email in sequence">
          <table className="table-x"><thead><tr><th>Email</th><th>Sent</th><th>Queued</th><th>Opened</th></tr></thead><tbody>
            {bySteps.map((s) => <tr key={s.step}><td>{s.step === 0 ? "Initial" : `Follow-up ${s.step}`}</td><td>{s.sent}</td><td>{s.queued}</td><td>{pct(s.opened, s.sent)}</td></tr>)}
          </tbody></table>
        </Card>
        {c.subjectB && <Card title={`A/B test${c.abWinner ? ` — winner: ${c.abWinner}` : ""}`}>
          <table className="table-x"><thead><tr><th>Variant</th><th>Subject</th><th>Sent to</th><th>Open</th><th>Reply</th></tr></thead><tbody>
            {variants.map((v) => <tr key={v.v}><td><b>{v.v}</b>{c.abWinner === v.v && " 🏆"}</td><td className="text-xs">{v.v === "B" ? c.subjectB : c.subjectA}</td><td>{v.n}</td><td>{pct(v.opened, v.n)}</td><td>{pct(v.replied, v.n)}</td></tr>)}
          </tbody></table>
          {!c.abWinner && <p className="mt-2 text-xs text-ink-500">The winner is chosen by {c.abWinnerMetric} rate {c.abTestEndsAt ? `after ${fmtDate(c.abTestEndsAt, true)}` : ""}, once the test slice has been sent.</p>}
        </Card>}
        <Card title="Link clicks" className={c.subjectB ? "" : "xl:col-span-2"}>
          {links.length ? <table className="table-x"><thead><tr><th>Link</th><th>Clicks</th><th>People</th></tr></thead><tbody>
            {links.map((l) => <tr key={l.url}><td className="max-w-md truncate"><a href={l.url} target="_blank" rel="noopener" className="text-brand-600 hover:underline">{l.url}</a></td><td>{l.clicks}</td><td>{l.people}</td></tr>)}
          </tbody></table> : <p className="text-sm text-ink-500">No tracked links yet.</p>}
        </Card>
      </div>

      <Card title={`Recipients (${rn})`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => <Link key={f} href={`${base}f=${f}`} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200"}`}>{f}</Link>)}
          <form className="ml-auto flex gap-2"><input type="hidden" name="f" value={filter} /><input name="q" defaultValue={sp.q} placeholder="Search email" className="input w-48" /><button className="btn-ghost btn-sm">Search</button></form>
        </div>
        <div className="overflow-x-auto"><table className="table-x"><thead><tr><th>Email</th><th>Business</th><th>Status</th><th>Variant</th><th>Opens</th><th>Clicks</th><th>Last opened</th><th>Replied</th></tr></thead><tbody>
          {recips.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td><Link href={`/admin/campaigns/${c.id}/recipients/${r.id}`} className="font-medium hover:underline">{r.email}</Link>{r.excludeReason && <div className="text-[11px] text-ink-500">{r.excludeReason}</div>}</td>
              <td className="text-xs">{r.contact?.businessName}</td><td><Badge>{r.status}</Badge></td><td>{r.variant ?? "—"}</td>
              <td>{r.openCount}</td><td>{r.clickCount}</td><td className="text-xs text-ink-500">{fmtDate(r.lastOpenAt, true)}</td>
              <td className="max-w-xs text-xs">{r.repliedAt ? <span title={r.replySnippet ?? ""}>{fmtDate(r.repliedAt, true)} — {(r.replySnippet ?? "").slice(0, 60)}</span> : "—"}</td>
            </tr>
          ))}
        </tbody></table></div>
        <Pagination page={page} pages={Math.ceil(rn / PER)} base={`${base}f=${filter}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
      </Card>
    </div>
  );
}
