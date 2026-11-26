import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { appScope, inScope, inScopeOrShared, DATA_CLASS_LABEL } from "@/lib/apps";
import { capacity } from "@/lib/caps";
import { getRaw } from "@/lib/settings";
import { env } from "@/lib/env";
import { AppBadge, Badge, Card, PageHeader, ScopeNote, Stat } from "@/components/admin/ui";
import { fmtDate, money, pct } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
const DAY = 86_400_000;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string; app?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scope = await appScope(user, sp.app);
  const appIds = scope.selected ? [scope.selected.id] : scope.ids;
  const leadScope = inScope(t.leads.applicationId, scope);
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY);
  const monthAgo = new Date(now - 30 * DAY);
  const stale = new Date(now - 2 * DAY);
  const firstStage = sql`${t.pipelineStages.order} = (select min(s2."order") from pipeline_stages s2 where s2.application_id = ${t.leads.applicationId})`;

  const [perApp, stageRows, daily, activeCampaigns, cap, mstats, upcoming, myTasks, recentLeads, heartbeat, pause, imapPoll, intakeFails] = await Promise.all([
    // One row per application: volumes, outcomes and response backlog.
    db.select({
      id: t.leads.applicationId,
      total: sql<number>`count(*)::int`,
      week: sql<number>`count(*) filter (where ${t.leads.createdAt} >= ${weekAgo})::int`,
      month: sql<number>`count(*) filter (where ${t.leads.createdAt} >= ${monthAgo})::int`,
      open: sql<number>`count(*) filter (where not ${t.pipelineStages.isWon} and not ${t.pipelineStages.isLost})::int`,
      won: sql<number>`count(*) filter (where ${t.pipelineStages.isWon})::int`,
      lost: sql<number>`count(*) filter (where ${t.pipelineStages.isLost})::int`,
      wonMonth: sql<number>`count(*) filter (where ${t.pipelineStages.isWon} and ${t.leads.updatedAt} >= ${monthAgo})::int`,
      waiting: sql<number>`count(*) filter (where ${firstStage} and ${t.leads.createdAt} < ${stale})::int`,
      openValue: sql<string>`coalesce(sum(${t.leads.value}) filter (where not ${t.pipelineStages.isWon} and not ${t.pipelineStages.isLost}),0)`,
      last: sql<string | null>`max(${t.leads.createdAt})`,
    }).from(t.leads).innerJoin(t.pipelineStages, eq(t.pipelineStages.id, t.leads.stageId)).where(leadScope).groupBy(t.leads.applicationId),
    db.select({ appId: t.pipelineStages.applicationId, id: t.pipelineStages.id, stage: t.pipelineStages.name, color: t.pipelineStages.color, order: t.pipelineStages.order, n: sql<number>`count(${t.leads.id})::int`, value: sql<string>`coalesce(sum(${t.leads.value}),0)` })
      .from(t.pipelineStages).leftJoin(t.leads, eq(t.leads.stageId, t.pipelineStages.id))
      .where(appIds.length ? inArray(t.pipelineStages.applicationId, appIds) : sql`false`)
      .groupBy(t.pipelineStages.id).orderBy(asc(t.pipelineStages.order)),
    db.select({ day: sql<string>`to_char(date_trunc('day', ${t.leads.createdAt} at time zone 'Europe/London'), 'YYYY-MM-DD')`, appId: t.leads.applicationId, n: sql<number>`count(*)::int` })
      .from(t.leads).where(and(leadScope, gte(t.leads.createdAt, monthAgo))).groupBy(sql`1`, t.leads.applicationId),
    db.select().from(t.campaigns).where(and(inScopeOrShared(t.campaigns.applicationId, scope, user), or(eq(t.campaigns.status, "SENDING"), eq(t.campaigns.status, "SCHEDULED"), eq(t.campaigns.status, "PAUSED"), eq(t.campaigns.status, "PENDING_APPROVAL")))).orderBy(desc(t.campaigns.updatedAt)).limit(6),
    capacity(),
    db.select({
      sent: sql<number>`count(*) filter (where ${t.emailMessages.status} in ('SENT','BOUNCED'))::int`,
      opened: sql<number>`count(*) filter (where ${t.emailMessages.openCount} > 0)::int`,
      clicked: sql<number>`count(*) filter (where ${t.emailMessages.clickCount} > 0)::int`,
      bounced: sql<number>`count(*) filter (where ${t.emailMessages.status} = 'BOUNCED')::int`,
    }).from(t.emailMessages).where(and(gte(t.emailMessages.createdAt, monthAgo), sql`${t.emailMessages.kind} in ('CAMPAIGN','FOLLOW_UP')`, inScopeOrShared(t.emailMessages.applicationId, scope, user))),
    db.select().from(t.bookings).where(and(gte(t.bookings.startsAt, new Date()), eq(t.bookings.status, "CONFIRMED"), inScopeOrShared(t.bookings.applicationId, scope, user))).orderBy(asc(t.bookings.startsAt)).limit(5),
    db.select({ tk: t.tasks, lead: t.leads }).from(t.tasks).innerJoin(t.leads, eq(t.leads.id, t.tasks.leadId))
      .where(and(eq(t.tasks.done, false), leadScope, or(eq(t.tasks.assigneeId, user.id), isNull(t.tasks.assigneeId)), lte(t.tasks.dueAt, new Date(now + 7 * DAY)))).orderBy(asc(t.tasks.dueAt)).limit(8),
    db.select({ l: t.leads, stage: t.pipelineStages, app: t.applications }).from(t.leads)
      .innerJoin(t.pipelineStages, eq(t.pipelineStages.id, t.leads.stageId)).innerJoin(t.applications, eq(t.applications.id, t.leads.applicationId))
      .where(leadScope).orderBy(desc(t.leads.createdAt)).limit(8),
    getRaw<{ at: string }>("worker.heartbeat"),
    getRaw<{ until: number; reason: string }>("sending.pause"),
    getRaw<{ at: string }>("imap.lastPoll"),
    db.select({ n: sql<number>`count(*)::int` }).from(t.webhookDeliveries).where(and(isNull(t.webhookDeliveries.deliveredAt), gte(t.webhookDeliveries.attempts, 3))),
  ]);
  const [replies] = await db.select({ n: sql<number>`count(*)::int` }).from(t.emailEvents)
    .innerJoin(t.emailMessages, eq(t.emailMessages.id, t.emailEvents.messageId))
    .where(and(eq(t.emailEvents.type, "REPLY"), gte(t.emailEvents.createdAt, monthAgo), inScopeOrShared(t.emailMessages.applicationId, scope, user)));
  const m = mstats[0];
  const workerOk = heartbeat && now - new Date(heartbeat.at).getTime() < 120_000;
  const paused = pause && pause.until > now;
  const sum = (k: keyof (typeof perApp)[number]) => perApp.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const appsShown = scope.selected ? [scope.selected] : scope.apps;
  const byId = new Map(perApp.map((r) => [r.id, r]));

  // 30-day trend, one column per day, stacked by application.
  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * DAY).toLocaleDateString("en-CA", { timeZone: "Europe/London" }));
  const dayTotals = days.map((d) => daily.filter((r) => r.day === d));
  const maxDay = Math.max(1, ...dayTotals.map((rows) => rows.reduce((s, r) => s + r.n, 0)));
  const appColor = new Map(scope.apps.map((a) => [a.id, a.color]));

  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} sub={scope.selected ? `Leads, pipeline and email for ${scope.selected.name}.` : "Every application's leads, pipeline and email in one place."}
        actions={<><Link href="/admin/leads/new" className="btn-primary">Add lead</Link><Link href="/admin/campaigns/new" className="btn-ghost">New campaign</Link></>} />
      <ScopeNote selected={scope.selected} count={scope.apps.length} />
      {sp.denied && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">That page is for administrators only.</p>}
      {!workerOk && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>Sending worker is not running.</b> No emails or source-app updates will go out. Start it with <code>pm2 start ecosystem.config.cjs</code> (last heartbeat: {heartbeat ? fmtDate(heartbeat.at, true) : "never"}).</p>}
      {paused && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>Sending paused until {fmtDate(new Date(pause!.until), true)}.</b> {pause!.reason}</p>}
      {intakeFails[0].n > 0 && user.role === "ADMIN" && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>{intakeFails[0].n} status update(s) could not be delivered</b> to a source application after 3 attempts. Check its webhook URL in <Link href="/admin/settings/applications" className="underline">Applications</Link>.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="New leads (7 days)" value={sum("week")} sub={`${sum("month")} in 30 days`} />
        <Stat label="Open leads" value={sum("open")} sub={`${money(sum("openValue"))} open value`} />
        <Stat label="Waiting over 48h" value={sum("waiting")} tone={sum("waiting") ? "bad" : "good"} sub={sum("waiting") ? <Link href={`/admin/leads?view=table&status=waiting${scope.selected ? `&app=${scope.selected.id}` : ""}`} className="underline">Still in the first stage →</Link> : "Nobody waiting"} />
        <Stat label="Won (30 days)" value={sum("wonMonth")} sub={`${pct(sum("won"), sum("won") + sum("lost"))} win rate, all time`} tone="good" />
        <Stat label="Replies (30 days)" value={replies.n} sub={`${pct(replies.n, m.sent)} of ${m.sent} campaign emails`} />
      </div>

      {!scope.selected && (
        <Card title="By application" className="mt-6" actions={<Link href="/admin/leads?view=table&sort=app" className="text-xs text-brand-600">All leads, sorted by application →</Link>}>
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Application</th><th>Data</th><th className="text-right">7 days</th><th className="text-right">30 days</th><th className="text-right">Open</th><th className="text-right">Waiting 48h+</th><th className="text-right">Won</th><th className="text-right">Win rate</th><th className="text-right">Open value</th><th>Last lead</th><th></th></tr></thead>
            <tbody>{appsShown.map((a) => {
              const r = byId.get(a.id);
              return (
                <tr key={a.id} className={a.active ? "" : "opacity-60"}>
                  <td><AppBadge app={a} />{!a.active && <span className="ml-1 text-[11px] text-ink-500">inactive</span>}</td>
                  <td className="text-xs">{DATA_CLASS_LABEL[a.dataClass]}</td>
                  <td className="text-right">{r?.week ?? 0}</td><td className="text-right">{r?.month ?? 0}</td><td className="text-right">{r?.open ?? 0}</td>
                  <td className={`text-right ${r?.waiting ? "font-semibold text-red-600" : ""}`}>{r?.waiting ?? 0}</td>
                  <td className="text-right">{r?.won ?? 0}</td><td className="text-right text-xs">{r ? pct(r.won, r.won + r.lost) : "—"}</td>
                  <td className="text-right text-xs">{r && Number(r.openValue) ? money(r.openValue) : "—"}</td>
                  <td className="text-xs text-ink-500">{r?.last ? fmtDate(r.last) : "No leads yet"}</td>
                  <td><Link href={`/admin/leads?app=${a.id}`} className="text-xs text-brand-600">Pipeline →</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </Card>
      )}

      <Card title="New leads per day, last 30 days" className="mt-6">
        <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={`${sum("month")} new leads in the last 30 days`}>
          {days.map((d, i) => {
            const rows = dayTotals[i];
            const total = rows.reduce((s, r) => s + r.n, 0);
            return (
              <div key={d} className="flex h-full flex-1 flex-col-reverse" title={`${fmtDate(d)}: ${total} lead${total === 1 ? "" : "s"}`}>
                {rows.map((r) => <span key={r.appId} style={{ height: `${(r.n / maxDay) * 100}%`, background: appColor.get(r.appId) ?? "#94a3b8" }} className="block w-full first:rounded-b-sm last:rounded-t-sm" />)}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ink-500"><span>{fmtDate(days[0])}</span><span>Today</span></div>
        {!scope.selected && <div className="mt-3 flex flex-wrap gap-3">{scope.apps.map((a) => <span key={a.id} className="flex items-center gap-1.5 text-[11px] text-ink-700"><span className="h-2 w-2 rounded-full" style={{ background: a.color }} />{a.name}</span>)}</div>}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title={scope.selected ? "Pipeline" : "Pipelines"} className="xl:col-span-2" actions={<Link href="/admin/leads" className="text-xs text-brand-600">Open board →</Link>}>
          <div className="space-y-6">
            {appsShown.map((a) => {
              const st = stageRows.filter((s) => s.appId === a.id);
              const max = Math.max(1, ...st.map((x) => x.n));
              if (!scope.selected && !byId.get(a.id)) return null;
              return (
                <div key={a.id}>
                  {!scope.selected && <p className="mb-2"><AppBadge app={a} /></p>}
                  <div className="space-y-1.5">{st.map((p) => (
                    <Link key={p.id} href={`/admin/leads?view=table&app=${a.id}&stage=${p.id}`} className="flex items-center gap-3 text-sm hover:opacity-80">
                      <span className="w-36 shrink-0 truncate text-ink-700">{p.stage}</span>
                      <span className="h-5 flex-1 rounded bg-gray-100"><span className="flex h-5 items-center rounded px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (p.n / max) * 100)}%`, background: p.color }}>{p.n}</span></span>
                      <span className="w-20 text-right text-xs text-ink-500">{Number(p.value) ? money(p.value) : ""}</span>
                    </Link>
                  ))}</div>
                </div>
              );
            })}
            {!perApp.length && <p className="text-sm text-ink-500">No leads yet. Connect an application in <Link href="/admin/settings/applications" className="text-brand-600 underline">Applications</Link>.</p>}
          </div>
        </Card>
        <Card title="Latest leads">
          {recentLeads.length ? <ul className="space-y-3 text-sm">{recentLeads.map(({ l, stage, app }) => (
            <li key={l.id}><Link href={`/admin/leads/${l.id}`} className="font-semibold hover:underline">{l.name}</Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">{!scope.selected && <AppBadge app={app} />}<span>{stage.name}</span><span>{fmtDate(l.createdAt, true)}</span></p></li>
          ))}</ul> : <p className="text-sm text-ink-500">No leads yet.</p>}
        </Card>

        <Card title="Email (30 days)" className="xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Campaign emails" value={m.sent} />
            <Stat label="Open rate" value={pct(m.opened, m.sent)} sub="Includes some machine opens" />
            <Stat label="Click rate" value={pct(m.clicked, m.sent)} />
            <Stat label="Bounce rate" value={pct(m.bounced, m.sent)} tone={m.sent && m.bounced / m.sent > 0.03 ? "bad" : undefined} sub={m.sent && m.bounced / m.sent > 0.03 ? "Above 3% — clean your lists" : "Keep below 3%"} />
          </div>
        </Card>
        <Card title="Upcoming calls" actions={<Link href="/admin/bookings" className="text-xs text-brand-600">All →</Link>}>
          {upcoming.length ? <ul className="space-y-3 text-sm">{upcoming.map((b) => (
            <li key={b.id}><Link href={b.leadId ? `/admin/leads/${b.leadId}` : "/admin/bookings"} className="font-semibold hover:underline">{b.name}</Link><p className="text-xs text-ink-500">{fmtDate(b.startsAt, true)} · {b.topic || "No topic"}</p></li>
          ))}</ul> : <p className="text-sm text-ink-500">No calls booked.</p>}
        </Card>
        <Card title="Active campaigns" className="xl:col-span-2" actions={<Link href="/admin/campaigns" className="text-xs text-brand-600">All →</Link>}>
          {activeCampaigns.length ? <table className="table-x"><tbody>{activeCampaigns.map((c) => (
            <tr key={c.id}><td><Link href={`/admin/campaigns/${c.id}`} className="font-semibold hover:underline">{c.name}</Link></td><td>{!scope.selected && <AppBadge app={scope.apps.find((a) => a.id === c.applicationId)} />}</td><td><Badge>{c.status}</Badge></td><td className="text-xs text-ink-500">{c.pauseReason ?? (c.scheduledAt ? `${c.status === "SCHEDULED" ? "Starts" : "Started"} ${fmtDate(c.scheduledAt, true)}` : "")}</td></tr>
          ))}</tbody></table> : <p className="text-sm text-ink-500">No active campaigns.</p>}
        </Card>
        <Card title="My tasks (next 7 days)">
          {myTasks.length ? <ul className="space-y-2 text-sm">{myTasks.map(({ tk, lead }) => (
            <li key={tk.id} className="flex justify-between gap-2"><Link href={`/admin/leads/${lead.id}`} className="hover:underline">{tk.title}</Link><span className={`text-xs ${tk.dueAt && tk.dueAt < new Date() ? "text-red-600" : "text-ink-500"}`}>{fmtDate(tk.dueAt)}</span></li>
          ))}</ul> : <p className="text-sm text-ink-500">Nothing due.</p>}
        </Card>
        <Card title="System" className="xl:col-span-3">
          <ul className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <li className="flex justify-between gap-2"><span>Sending worker</span><Badge tone={workerOk ? "green" : "red"}>{workerOk ? "Running" : "Stopped"}</Badge></li>
            <li className="flex justify-between gap-2"><span>Mailbox monitor</span><span className="text-xs text-ink-500">{env.imap.enabled ? (imapPoll ? `Checked ${fmtDate(imapPoll.at, true)}` : "Not yet") : "Disabled"}</span></li>
            <li className="flex justify-between gap-2"><span>Default sender</span><span className="truncate text-xs text-ink-500">{env.mail.fromAddress}</span></li>
            <li className="flex justify-between gap-2"><span>Sent today / cap</span><span className="text-xs text-ink-500">{cap.last24} / {cap.dailyCap}</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
