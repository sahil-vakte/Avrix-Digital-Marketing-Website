import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { capacity } from "@/lib/caps";
import { getRaw, getSetting } from "@/lib/settings";
import { env } from "@/lib/env";
import { Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { saveCompliance, saveStage, testSmtp, togglePause } from "./actions";
import { checkDns } from "@/lib/dns-check";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser({ admin: true });
  const sp = await searchParams;
  const domain = env.mail.fromAddress.split("@")[1] ?? "";
  const [cap, comp, pause, heartbeat, imap, stages, dnsr] = await Promise.all([
    capacity(), getSetting("compliance"), getRaw<{ until: number; reason: string }>("sending.pause"), getRaw<{ at: string }>("worker.heartbeat"),
    getRaw<{ at: string; processed: number }>("imap.lastPoll"), db.select().from(t.pipelineStages).orderBy(asc(t.pipelineStages.order)),
    domain ? checkDns(domain) : null,
  ]);
  const paused = pause && pause.until > Date.now();
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <><dt className="text-ink-500">{k}</dt><dd className="break-all">{v}</dd></>;
  return (
    <div>
      <PageHeader title="Settings" actions={<><Link href="/admin/settings/users" className="btn-ghost">Users</Link><Link href="/admin/settings/countries" className="btn-ghost">Country rules</Link></>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Sending account" actions={<form action={testSmtp}><SubmitButton className="btn-ghost btn-sm" pendingText="Testing…">Test SMTP login</SubmitButton></form>}>
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <Row k="From" v={`${env.mail.fromName} <${env.mail.fromAddress}>`} />
            <Row k="Reply-to" v={env.mail.replyTo || "—"} />
            <Row k="SMTP" v={`${env.smtp.host}:${env.smtp.port} (${env.smtp.secure ? "SSL" : "STARTTLS"}) · ${env.smtp.authMode === "oauth2" ? "OAuth 2.0 service account" : "app password"}`} />
            <Row k="IMAP monitor" v={env.imap.enabled ? `${env.imap.host}:${env.imap.port}, every ${env.imap.pollMinutes} min · last check ${imap ? fmtDate(imap.at, true) : "never"}` : "Disabled"} />
            <Row k="Worker" v={<Badge tone={heartbeat && Date.now() - new Date(heartbeat.at).getTime() < 120_000 ? "green" : "red"}>{heartbeat ? `Last seen ${fmtDate(heartbeat.at, true)}` : "Never seen"}</Badge>} />
            <Row k="Daily cap" v={`${cap.dailyCap}/day${cap.warmupDay ? ` (warm-up day ${cap.warmupDay}; full cap ${env.send.dailyCap})` : ""} · used ${cap.last24} in last 24h`} />
            <Row k="Hourly cap" v={`${cap.hourlyCap}/hour · used ${cap.lastHour}`} />
            <Row k="Gap between emails" v={`${env.send.minGap}–${env.send.maxGap} seconds (random)`} />
            <Row k="Bounce auto-pause" v={`${(env.send.bouncePauseThreshold * 100).toFixed(1)}% after ${env.send.bouncePauseMinSent} sends`} />
          </dl>
          <p className="mt-3 text-xs text-ink-500">These values come from the server's <code>.env</code> file. Change them there and restart with <code>pm2 restart all</code>.</p>
          <div className="mt-4 border-t pt-4">
            {paused ? (
              <form action={togglePause} className="flex items-center gap-3"><input type="hidden" name="op" value="resume" /><span className="text-sm text-amber-700">All sending paused until {fmtDate(new Date(pause!.until), true)} — {pause!.reason}</span><SubmitButton>Resume sending</SubmitButton></form>
            ) : (
              <form action={togglePause} className="flex items-center gap-2"><input type="hidden" name="op" value="pause" /><span className="text-sm">Emergency stop: pause all sending for</span><select name="hours" className="input w-28"><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option></select><SubmitButton className="btn-danger btn-sm">Pause</SubmitButton></form>
            )}
          </div>
        </Card>

        <Card title={`Domain authentication — ${domain}`}>
          {dnsr ? (
            <ul className="space-y-3 text-sm">
              <li><Badge tone={dnsr.spfOk ? "green" : "red"}>{dnsr.spfOk ? "SPF OK" : "SPF missing"}</Badge><code className="mt-1 block break-all text-xs text-ink-500">{dnsr.spf ?? "No SPF record. Add TXT: v=spf1 include:_spf.google.com ~all"}</code></li>
              <li><Badge tone={dnsr.dkim ? "green" : "red"}>{dnsr.dkim ? "DKIM OK" : "DKIM missing"}</Badge><code className="mt-1 block break-all text-xs text-ink-500">{dnsr.dkim ? `google._domainkey: ${dnsr.dkim.slice(0, 80)}…` : "Generate a DKIM key in Google Admin → Apps → Gmail → Authenticate email, then publish it."}</code></li>
              <li><Badge tone={dnsr.dmarc ? "green" : "red"}>{dnsr.dmarc ? "DMARC OK" : "DMARC missing"}</Badge><code className="mt-1 block break-all text-xs text-ink-500">{dnsr.dmarc ?? `Add TXT on _dmarc.${domain}: v=DMARC1; p=none; rua=mailto:dmarc@${domain}`}</code></li>
              <li><Badge tone={dnsr.mx.length ? "green" : "amber"}>{dnsr.mx.length ? "MX OK" : "No MX"}</Badge><code className="mt-1 block text-xs text-ink-500">{dnsr.mx.join(", ") || "Replies cannot be received without MX records"}</code></li>
            </ul>
          ) : <p className="text-sm text-ink-500">Set MAIL_FROM_ADDRESS in .env.</p>}
          <p className="mt-3 text-xs text-ink-500">Gmail and Yahoo require SPF, DKIM and DMARC for bulk senders. Use a separate outreach domain so your main domain's reputation is protected.</p>
        </Card>

        <Card title="Compliance rules">
          <form action={saveCompliance} className="space-y-3 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" name="unknownTypeRequiresConsent" defaultChecked={comp.unknownTypeRequiresConsent} className="mt-1" /><span><b>Treat unknown business type as needing consent.</b> Recommended: a contact might be a sole trader, who is an individual subscriber under PECR.</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" name="requireApprovalForStaff" defaultChecked={comp.requireApprovalForStaff} className="mt-1" /><span><b>Staff campaigns need admin approval</b> before they are sent.</span></label>
            <label className="flex items-center gap-2">Flag contacts with no engagement after <input name="retentionMonths" type="number" min={6} max={120} defaultValue={comp.retentionMonths} className="input w-20" /> months for deletion review</label>
            <SubmitButton>Save rules</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-ink-500">Per-country consent rules: <Link href="/admin/settings/countries" className="text-brand-600 underline">Country rules</Link>. Not legal advice — confirm with your adviser.</p>
        </Card>

        <Card title="Pipeline stages">
          <div className="space-y-2">
            {[...stages, null].map((s, i) => (
              <form key={s?.id ?? "new"} action={saveStage} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={s?.id ?? ""} />
                <input name="order" type="number" defaultValue={s?.order ?? stages.length + 1} className="input w-16" aria-label="Order" />
                <input name="name" defaultValue={s?.name ?? ""} placeholder="New stage" required className="input w-40" />
                <input name="color" type="color" defaultValue={s?.color ?? "#3563f2"} className="h-9 w-10 rounded border" aria-label="Colour" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isWon" defaultChecked={s?.isWon} />Won</label>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isLost" defaultChecked={s?.isLost} />Lost</label>
                <SubmitButton className="btn-ghost btn-sm">{s ? "Save" : "Add"}</SubmitButton>
                {s && stages.length > 2 && i > 0 && <SubmitButton className="btn-ghost btn-sm text-red-600" name="delete" value="1">Delete</SubmitButton>}
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">Automations look for stages named “Contacted”, “Replied” and “Meeting booked”.</p>
        </Card>
      </div>
    </div>
  );
}
