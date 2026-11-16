import Link from "next/link";
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { capacity } from "@/lib/caps";
import { getRaw } from "@/lib/settings";
import { env } from "@/lib/env";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";
import { fmtDate, money, pct } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const [newLeads, pipeline, activeCampaigns, cap, mstats, upcoming, myTasks, recentLeads, heartbeat, pause, imapPoll] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(t.leads).where(gte(t.leads.createdAt, weekAgo)),
    db.select({ stage: t.pipelineStages.name, color: t.pipelineStages.color, order: t.pipelineStages.order, n: sql<number>`count(${t.leads.id})::int`, value: sql<string>`coalesce(sum(${t.leads.value}),0)` })
      .from(t.pipelineStages).leftJoin(t.leads, eq(t.leads.stageId, t.pipelineStages.id))
      .groupBy(t.pipelineStages.id).orderBy(asc(t.pipelineStages.order)),
    db.select().from(t.campaigns).where(or(eq(t.campaigns.status, "SENDING"), eq(t.campaigns.status, "SCHEDULED"), eq(t.campaigns.status, "PAUSED"), eq(t.campaigns.status, "PENDING_APPROVAL"))).orderBy(desc(t.campaigns.updatedAt)).limit(6),
    capacity(),
    db.select({
      sent: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('SENT','BOUNCED'))::int`,
      opened: sql<number>`count(*) filter (where ${t.emailMessages.openCount} > 0)::int`,
      clicked: sql<number>`count(*) filter (where ${t.emailMessages.clickCount} > 0)::int`,
      bounced: sql<number>`count(*) filter (where ${t.emailMessages.status} = 'BOUNCED')::int`,
    }).from(t.emailMessages).where(and(gte(t.emailMessages.createdAt, monthAgo), sql`${t.emailMessages.kind} in ('CAMPAIGN','FOLLOW_UP')`)),
    db.select().from(t.bookings).where(and(gte(t.bookings.startsAt, new Date()), eq(t.bookings.status, "CONFIRMED"))).orderBy(asc(t.bookings.startsAt)).limit(5),
    db.query.tasks.findMany({ where: and(eq(t.tasks.done, false), or(eq(t.tasks.assigneeId, user.id), isNull(t.tasks.assigneeId)), lte(t.tasks.dueAt, new Date(Date.now() + 7 * 86_400_000))), with: { lead: true }, orderBy: asc(t.tasks.dueAt), limit: 8 }),
    db.query.leads.findMany({ with: { stage: true }, orderBy: desc(t.leads.createdAt), limit: 6 }),
    getRaw<{ at: string }>("worker.heartbeat"),
    getRaw<{ until: number; reason: string }>("sending.pause"),
    getRaw<{ at: string }>("imap.lastPoll"),
  ]);
  const [replies] = await db.select({ n: sql<number>`count(*)::int` }).from(t.emailEvents).where(and(eq(t.emailEvents.type, "REPLY"), gte(t.emailEvents.createdAt, monthAgo)));
  const m = mstats[0];
  const workerOk = heartbeat && Date.now() - new Date(heartbeat.at).getTime() < 120_000;
  const paused = pause && pause.until > Date.now();
  const openValue = pipeline.filter((p) => !["Won", "Lost"].includes(p.stage)).reduce((s, p) => s + Number(p.value), 0);

  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} sub="Here's what is happening across leads and campaigns." actions={<><Link href="/admin/campaigns/new" className="btn-primary">New campaign</Link><Link href="/admin/leads/new" className="btn-ghost">Add lead</Link></>} />
      {denied && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">That page is for administrators only.</p>}
      {!workerOk && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>Sending worker is not running.</b> No emails will go out. Start it with <code>pm2 start ecosystem.config.cjs</code> (last heartbeat: {heartbeat ? fmtDate(heartbeat.at, true) : "never"}).</p>}
      {paused && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>Sending paused until {fmtDate(new Date(pause!.until), true)}.</b> {pause!.reason}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New leads (7 days)" value={newLeads[0].n} />
        <Stat label="Open pipeline value" value={money(openValue)} />
        <Stat label="Sent today / cap" value={`${cap.last24} / ${cap.dailyCap}`} sub={cap.warmupDay ? `Warm-up day ${cap.warmupDay} of ${env.send.warmupSchedule.length}` : `${cap.lastHour}/${cap.hourlyCap} this hour`} />
        <Stat label="Replies (30 days)" value={replies.n} sub={`${pct(replies.n, m.sent)} reply rate`} tone="good" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Emails sent (30 days)" value={m.sent} />
        <Stat label="Open rate" value={pct(m.opened, m.sent)} sub="Opens include some machine opens" />
        <Stat label="Click rate" value={pct(m.clicked, m.sent)} />
        <Stat label="Bounce rate" value={pct(m.bounced, m.sent)} tone={m.sent && m.bounced / m.sent > 0.03 ? "bad" : undefined} sub={m.sent && m.bounced / m.sent > 0.03 ? "Above 3% — clean your lists" : "Keep below 3%"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Pipeline" className="xl:col-span-2" actions={<Link href="/admin/leads" className="text-xs text-brand-600">Open board →</Link>}>
          <div className="space-y-2">
            {pipeline.map((p) => {
              const max = Math.max(1, ...pipeline.map((x) => x.n));
              return (
                <div key={p.stage} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-ink-700">{p.stage}</span>
                  <span className="h-6 flex-1 rounded bg-gray-100"><span className="flex h-6 items-center rounded px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (p.n / max) * 100)}%`, background: p.color }}>{p.n}</span></span>
                  <span className="w-20 text-right text-xs text-ink-500">{money(p.value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Upcoming calls" actions={<Link href="/admin/bookings" className="text-xs text-brand-600">All →</Link>}>
          {upcoming.length ? <ul className="space-y-3 text-sm">{upcoming.map((b) => (
            <li key={b.id}><Link href={b.leadId ? `/admin/leads/${b.leadId}` : "/admin/bookings"} className="font-semibold hover:underline">{b.name}</Link><p className="text-xs text-ink-500">{fmtDate(b.startsAt, true)} · {b.topic || "No topic"}</p></li>
          ))}</ul> : <p className="text-sm text-ink-500">No calls booked.</p>}
        </Card>
        <Card title="Active campaigns" className="xl:col-span-2" actions={<Link href="/admin/campaigns" className="text-xs text-brand-600">All →</Link>}>
          {activeCampaigns.length ? <table className="table-x"><tbody>{activeCampaigns.map((c) => (
            <tr key={c.id}><td><Link href={`/admin/campaigns/${c.id}`} className="font-semibold hover:underline">{c.name}</Link></td><td><Badge>{c.status}</Badge></td><td className="text-xs text-ink-500">{c.pauseReason ?? (c.scheduledAt ? `${c.status === "SCHEDULED" ? "Starts" : "Started"} ${fmtDate(c.scheduledAt, true)}` : "")}</td></tr>
          ))}</tbody></table> : <p className="text-sm text-ink-500">No active campaigns.</p>}
        </Card>
        <Card title="My tasks (next 7 days)">
          {myTasks.length ? <ul className="space-y-2 text-sm">{myTasks.map((tk) => (
            <li key={tk.id} className="flex justify-between gap-2"><span>{tk.lead ? <Link href={`/admin/leads/${tk.lead.id}`} className="hover:underline">{tk.title}</Link> : tk.title}</span><span className={`text-xs ${tk.dueAt && tk.dueAt < new Date() ? "text-red-600" : "text-ink-500"}`}>{fmtDate(tk.dueAt)}</span></li>
          ))}</ul> : <p className="text-sm text-ink-500">Nothing due.</p>}
        </Card>
        <Card title="Latest leads" className="xl:col-span-2">
          <table className="table-x"><tbody>{recentLeads.map((l) => (
            <tr key={l.id}><td><Link href={`/admin/leads/${l.id}`} className="font-semibold hover:underline">{l.name}</Link><div className="text-xs text-ink-500">{l.businessName}</div></td><td className="text-xs">{l.source.replace(/_/g, " ").toLowerCase()}</td><td><Badge tone="blue">{l.stage.name}</Badge></td><td className="text-xs text-ink-500">{fmtDate(l.createdAt)}</td></tr>
          ))}</tbody></table>
        </Card>
        <Card title="System">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Sending worker</span><Badge tone={workerOk ? "green" : "red"}>{workerOk ? "Running" : "Stopped"}</Badge></li>
            <li className="flex justify-between"><span>Mailbox monitor</span><span className="text-xs text-ink-500">{env.imap.enabled ? (imapPoll ? `Checked ${fmtDate(imapPoll.at, true)}` : "Not yet") : "Disabled"}</span></li>
            <li className="flex justify-between"><span>Sending account</span><span className="text-xs text-ink-500">{env.mail.fromAddress}</span></li>
            <li className="flex justify-between"><span>Remaining today</span><span className="text-xs text-ink-500">{cap.remainingToday}</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
