import Link from "next/link";
import { cookies } from "next/headers";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { listApplications, REVEAL_COOKIE, DATA_CLASS_LABEL, STAGE_PRESETS } from "@/lib/apps";
import { AppBadge, Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton, ConfirmButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { saveStage } from "../actions";
import { createApplication, createKey, dismissReveal, retryWebhooks, revokeKey, rotateWebhookSecret, saveApplication } from "./actions";

export const metadata = { title: "Applications" };

type Revealed = { kind: "key"; appId: string; key: string; secret: string } | { kind: "webhook"; appId: string; secret: string };

export default async function Applications({ searchParams }: { searchParams: Promise<{ id?: string; ok?: string; error?: string }> }) {
  await requireUser({ admin: true });
  const sp = await searchParams;
  const apps = await listApplications();
  const counts = await db.select({ id: t.leads.applicationId, n: sql<number>`count(*)::int`, last: sql<string | null>`max(${t.leads.createdAt})` }).from(t.leads).groupBy(t.leads.applicationId);
  const keyCounts = await db.select({ id: t.applicationKeys.applicationId, n: sql<number>`count(*)::int` }).from(t.applicationKeys).where(isNull(t.applicationKeys.revokedAt)).groupBy(t.applicationKeys.applicationId);
  const app = apps.find((a) => a.id === sp.id || a.key === sp.id);

  let revealed: Revealed | null = null;
  const raw = (await cookies()).get(REVEAL_COOKIE)?.value;
  if (raw) try { revealed = JSON.parse(decrypt(raw)); } catch { revealed = null; }

  return (
    <div className="max-w-6xl">
      <PageHeader title="Applications" sub="Every website and product that sends leads into this CRM. Each one has its own pipeline, API key, sender and staff access."
        actions={<Link href="/admin/settings" className="btn-ghost">Settings</Link>} />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="table-x">
          <thead><tr><th>Application</th><th>Key</th><th>Data</th><th>Campaigns</th><th className="text-right">Leads</th><th>Last lead</th><th>API keys</th><th></th></tr></thead>
          <tbody>{apps.map((a) => {
            const c = counts.find((x) => x.id === a.id);
            const k = keyCounts.find((x) => x.id === a.id)?.n ?? 0;
            return (
              <tr key={a.id} className={a.id === app?.id ? "bg-brand-50" : "hover:bg-gray-50"}>
                <td><AppBadge app={a} />{!a.active && <span className="ml-2 text-xs text-ink-500">inactive</span>}{a.domain && <div className="mt-0.5 text-xs text-ink-500">{a.domain}</div>}</td>
                <td><code className="text-xs">{a.key}</code></td>
                <td>{a.dataClass === "HEALTH" ? <Badge tone="amber">Health data</Badge> : <span className="text-xs">{DATA_CLASS_LABEL[a.dataClass]}</span>}</td>
                <td className="text-xs">{a.campaignsAllowed ? "Allowed" : "Off"}</td>
                <td className="text-right">{c?.n ?? 0}</td>
                <td className="text-xs text-ink-500">{c?.last ? fmtDate(c.last, true) : "—"}</td>
                <td>{k ? <Badge tone="green">{`${k} active`}</Badge> : <Badge tone="gray">None</Badge>}</td>
                <td><Link href={`/admin/settings/applications?id=${a.id}`} className="text-xs text-brand-600">Manage →</Link></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {app ? <AppDetail app={app} revealed={revealed?.appId === app.id ? revealed : null} /> : (
        <Card title="Add an application" className="mt-6">
          <form action={createApplication} className="grid items-end gap-3 md:grid-cols-6">
            <label className="md:col-span-2"><span className="label">Name</span><input name="name" required placeholder="e.g. Rite Wellness" className="input" /></label>
            <label><span className="label">Key (slug)</span><input name="key" placeholder="rite-wellness" className="input" /></label>
            <label><span className="label">Domain</span><input name="domain" placeholder="ritewellness.com" className="input" /></label>
            <label><span className="label">Data type</span><select name="dataClass" className="input"><option value="BUSINESS">Business</option><option value="HEALTH">Health data</option><option value="RECRUITMENT">Recruitment</option></select></label>
            <label><span className="label">Pipeline</span><select name="preset" className="input">{Object.keys(STAGE_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span className="label">Colour</span><input name="color" type="color" defaultValue="#3563f2" className="h-9 w-full rounded border" /></label>
            <div className="md:col-span-5"><SubmitButton>Add application</SubmitButton></div>
          </form>
        </Card>
      )}
    </div>
  );
}

async function AppDetail({ app, revealed }: { app: Awaited<ReturnType<typeof listApplications>>[number]; revealed: Revealed | null }) {
  const [stages, keys, members, pending, recentIntake] = await Promise.all([
    db.select({ s: t.pipelineStages, n: sql<number>`(select count(*)::int from leads l where l.stage_id = ${t.pipelineStages.id})` }).from(t.pipelineStages).where(eq(t.pipelineStages.applicationId, app.id)).orderBy(asc(t.pipelineStages.order)),
    db.select().from(t.applicationKeys).where(eq(t.applicationKeys.applicationId, app.id)).orderBy(desc(t.applicationKeys.createdAt)),
    db.select({ name: t.users.name, email: t.users.email }).from(t.userApplications).innerJoin(t.users, eq(t.users.id, t.userApplications.userId)).where(eq(t.userApplications.applicationId, app.id)),
    db.select({ n: sql<number>`count(*)::int`, err: sql<string | null>`max(${t.webhookDeliveries.lastError})` }).from(t.webhookDeliveries).where(and(eq(t.webhookDeliveries.applicationId, app.id), isNull(t.webhookDeliveries.deliveredAt))),
    db.select().from(t.intakeEvents).where(eq(t.intakeEvents.applicationId, app.id)).orderBy(desc(t.intakeEvents.createdAt)).limit(8),
  ]);
  const endpoint = `${env.appUrl}/api/intake/leads`;
  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><AppBadge app={app} /> settings</h2>
        <Link href="/admin/settings/applications" className="btn-ghost btn-sm">Add another application</Link></div>

      {revealed && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm">
          <p className="font-bold text-amber-900">Copy these now. They are shown once and disappear in 3 minutes.</p>
          <dl className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
            {revealed.kind === "key" && <><dt className="text-amber-900">AVRIX_CRM_KEY</dt><dd><code className="select-all break-all rounded bg-white px-2 py-1">{revealed.key}</code></dd></>}
            <dt className="text-amber-900">{revealed.kind === "key" ? "AVRIX_CRM_SECRET" : "AVRIX_CRM_WEBHOOK_SECRET"}</dt><dd><code className="select-all break-all rounded bg-white px-2 py-1">{revealed.secret}</code></dd>
            {revealed.kind === "key" && <><dt className="text-amber-900">AVRIX_CRM_URL</dt><dd><code className="select-all rounded bg-white px-2 py-1">{env.appUrl}</code></dd></>}
          </dl>
          <p className="mt-3 text-amber-900">Put them in the source application&apos;s environment file (never in Git). See <code>docs/INTAKE-API.md</code> for each app.</p>
          <form action={dismissReveal} className="mt-3"><input type="hidden" name="id" value={app.id} /><SubmitButton className="btn-ghost btn-sm">I&apos;ve copied them</SubmitButton></form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Details">
          <form action={saveApplication} className="space-y-3"><input type="hidden" name="id" value={app.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label">Name</span><input name="name" defaultValue={app.name} className="input" required /></label>
              <label><span className="label">Domain</span><input name="domain" defaultValue={app.domain ?? ""} className="input" /></label>
              <label><span className="label">Data type</span><select name="dataClass" defaultValue={app.dataClass} className="input"><option value="BUSINESS">Business</option><option value="HEALTH">Health data</option><option value="RECRUITMENT">Recruitment</option></select></label>
              <div className="grid grid-cols-2 gap-2">
                <label><span className="label">Colour</span><input name="color" type="color" defaultValue={app.color} className="h-9 w-full rounded border" /></label>
                <label><span className="label">Order</span><input name="sortOrder" type="number" defaultValue={app.sortOrder} className="input" /></label>
              </div>
              <label><span className="label">New-lead alerts to</span><input name="alertEmail" type="email" defaultValue={app.alertEmail ?? ""} placeholder={env.adminAlertEmail || "you@example.com"} className="input" /></label>
              <label><span className="label">Keep leads for (months)</span><input name="retentionMonths" type="number" min={1} defaultValue={app.retentionMonths ?? ""} placeholder="Company default" className="input" /></label>
              <label className="sm:col-span-2"><span className="label">Link to the record in the source app</span><input name="recordUrlTemplate" defaultValue={app.recordUrlTemplate ?? ""} placeholder="https://example.com/admin/enquiries/{id}" className="input" />
                <span className="mt-1 block text-xs text-ink-500"><code>{"{id}"}</code> is replaced with the lead&apos;s externalId.</span></label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={app.active} /> Active (accepts new leads)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="campaignsAllowed" defaultChecked={app.campaignsAllowed} disabled={app.dataClass === "HEALTH"} /> Campaigns allowed</label>
            </div>
            {app.dataClass === "HEALTH" && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Health applications never feed contact lists or campaigns, and alert emails carry no personal details. Only staff ticked under Settings → Users can see these leads.</p>}

            <fieldset className="border-t pt-3"><legend className="label">Sending identity (one-to-one emails and campaigns)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">From name</span><input name="fromName" defaultValue={app.fromName ?? ""} placeholder={env.mail.fromName} className="input" /></label>
                <label><span className="label">From address</span><input name="fromAddress" type="email" defaultValue={app.fromAddress ?? ""} placeholder={env.mail.fromAddress} className="input" /></label>
                <label><span className="label">Reply-to</span><input name="replyTo" type="email" defaultValue={app.replyTo ?? ""} className="input" /></label>
                <label><span className="label">Legal name (email footer)</span><input name="legalName" defaultValue={app.legalName ?? ""} placeholder={env.company.legalName} className="input" /></label>
                <label className="sm:col-span-2"><span className="label">Postal address (email footer)</span><input name="postalAddress" defaultValue={app.postalAddress ?? ""} placeholder={env.company.address} className="input" /></label>
              </div>
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-brand-600">Own SMTP mailbox (optional)</summary>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label><span className="label">SMTP host</span><input name="smtpHost" defaultValue={app.smtpHost ?? ""} placeholder="smtp.gmail.com" className="input" /></label>
                  <label><span className="label">Port</span><input name="smtpPort" type="number" defaultValue={app.smtpPort ?? ""} placeholder="465" className="input" /></label>
                  <label><span className="label">Username</span><input name="smtpUser" defaultValue={app.smtpUser ?? ""} className="input" autoComplete="off" /></label>
                  <label><span className="label">Password {app.smtpPassEnc && <span className="font-normal text-green-700">(saved)</span>}</span><input name="smtpPass" type="password" className="input" autoComplete="new-password" placeholder={app.smtpPassEnc ? "Leave blank to keep" : ""} /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="smtpSecure" defaultChecked={app.smtpSecure} /> SSL (port 465)</label>
                  {app.smtpPassEnc && <label className="flex items-center gap-2"><input type="checkbox" name="clearSmtpPass" /> Remove saved password</label>}
                </div>
                <p className="mt-2 text-xs text-ink-500">Without its own mailbox, this application&apos;s email goes through the default account in <code>.env</code> using the From address above (it must be a verified “Send mail as” alias there). Replies are only tracked in the default mailbox.</p>
              </details>
            </fieldset>
            <label className="block"><span className="label">Notes</span><textarea name="notes" rows={2} defaultValue={app.notes ?? ""} className="input" /></label>
            <input type="hidden" name="webhookUrl" value={app.webhookUrl ?? ""} />
            <SubmitButton>Save details</SubmitButton>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Pipeline" actions={<span className="text-xs text-ink-500">{stages.length} stages</span>}>
            <div id="pipeline" className="space-y-2">
              {[...stages, null].map((row, i) => {
                const s = row?.s;
                return (
                  <form key={s?.id ?? "new"} action={saveStage} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={s?.id ?? ""} /><input type="hidden" name="applicationId" value={app.id} />
                    <input name="order" type="number" defaultValue={s?.order ?? stages.length + 1} className="input w-16" aria-label="Order" />
                    <input name="name" defaultValue={s?.name ?? ""} placeholder="New stage" required className="input w-40" />
                    <input name="color" type="color" defaultValue={s?.color ?? "#3563f2"} className="h-9 w-10 rounded border" aria-label="Colour" />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isWon" defaultChecked={s?.isWon} />Won</label>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isLost" defaultChecked={s?.isLost} />Lost</label>
                    <SubmitButton className="btn-ghost btn-sm">{s ? "Save" : "Add"}</SubmitButton>
                    {s && stages.length > 2 && i > 0 && <ConfirmButton className="btn-ghost btn-sm text-red-600" name="delete" value="1" message={`Delete “${s.name}”? Its ${row!.n} lead(s) move to the first stage.`}>Delete</ConfirmButton>}
                    {s && <span className="text-xs text-ink-500">{row!.n} lead{row!.n === 1 ? "" : "s"}</span>}
                  </form>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-500">Source apps can set a stage by name. Campaign automations look for “Contacted”, “Replied” and “Meeting booked”.</p>
          </Card>

          <Card title="API keys">
            <div id="keys" className="space-y-2 text-sm">
              {keys.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-2">
                  <span><code>{k.prefix}…</code> <span className="text-ink-500">{k.label}</span></span>
                  <span className="text-xs text-ink-500">{k.revokedAt ? `Revoked ${fmtDate(k.revokedAt)}` : k.lastUsedAt ? `Last used ${fmtDate(k.lastUsedAt, true)}` : "Never used"}</span>
                  {!k.revokedAt && <form action={revokeKey}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="keyId" value={k.id} /><ConfirmButton className="btn-ghost btn-sm text-red-600" message="Revoke this key? The application using it will stop sending leads until it has a new key.">Revoke</ConfirmButton></form>}
                </div>
              ))}
              {!keys.length && <p className="text-ink-500">No keys yet. Generate one and put it in the source app&apos;s environment.</p>}
            </div>
            <form action={createKey} className="mt-3 flex gap-2"><input type="hidden" name="id" value={app.id} /><input name="label" placeholder="Label, e.g. Production" className="input" /><SubmitButton>Generate key</SubmitButton></form>
            <details className="mt-3 text-xs"><summary className="cursor-pointer text-brand-600">How the source app sends a lead</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-[11px] leading-relaxed text-gray-100">{`POST ${endpoint}
Authorization: Bearer $AVRIX_CRM_KEY
X-Avrix-Timestamp: <unix seconds>
X-Avrix-Signature: sha256=<hex HMAC-SHA256(secret, timestamp + "." + body)>
Idempotency-Key: <unique id of the submission>
Content-Type: application/json

{"externalId":"123","name":"Jane Smith","email":"jane@example.com",
 "phone":"+44…","message":"…","stage":"New","customFields":{"clinic":"Leicester"}}`}</pre>
            </details>
          </Card>

          <Card title="Status updates back to the source app">
            <form id="webhook" action={saveApplication} className="space-y-2">
              <p className="text-xs text-ink-500">When someone moves one of this application&apos;s leads to another stage here, the CRM sends a signed <code>lead.stage_changed</code> event to this URL.</p>
              <HiddenAppFields app={app} />
              <label className="block"><span className="label">Webhook URL</span><input name="webhookUrl" defaultValue={app.webhookUrl ?? ""} placeholder="https://example.com/api/crm-webhook" className="input" /></label>
              <SubmitButton className="btn-ghost btn-sm">Save URL</SubmitButton>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-ink-500">Signing secret: {app.webhookSecretEnc ? "set" : "not set"}</span>
              <form action={rotateWebhookSecret}><input type="hidden" name="id" value={app.id} /><SubmitButton className="btn-ghost btn-sm">{app.webhookSecretEnc ? "Rotate secret" : "Generate secret"}</SubmitButton></form>
              {pending[0].n > 0 && <form action={retryWebhooks} className="flex items-center gap-2"><input type="hidden" name="id" value={app.id} /><Badge tone="amber">{`${pending[0].n} waiting`}</Badge><SubmitButton className="btn-ghost btn-sm">Retry now</SubmitButton></form>}
            </div>
            {pending[0].err && <p className="mt-2 text-xs text-red-600">Last error: {pending[0].err}</p>}
          </Card>

          <Card title="Who can see this application">
            {app.dataClass !== "HEALTH" && !members.length ? <p className="text-sm text-ink-500">Administrators, plus staff who have no applications ticked (business applications are visible to them by default).</p>
              : <ul className="space-y-1 text-sm">{members.map((m) => <li key={m.email}>{m.name} <span className="text-xs text-ink-500">{m.email}</span></li>)}{!members.length && <li className="text-ink-500">Administrators only.</li>}</ul>}
            <Link href="/admin/settings/users" className="mt-2 inline-block text-xs text-brand-600">Change in Users →</Link>
          </Card>

          <Card title="Recent intake calls">
            {recentIntake.length ? <ul className="space-y-1 text-xs">{recentIntake.map((e) => <li key={e.id} className="flex justify-between gap-2"><span>{e.outcome}{e.leadId && <> · <Link href={`/admin/leads/${e.leadId}`} className="text-brand-600">lead</Link></>}</span><span className="text-ink-500">{fmtDate(e.createdAt, true)}</span></li>)}</ul>
              : <p className="text-sm text-ink-500">Nothing received yet.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The webhook form re-posts the saved details so saving the URL does not reset other fields. */
function HiddenAppFields({ app }: { app: Awaited<ReturnType<typeof listApplications>>[number] }) {
  const v: Record<string, string> = {
    id: app.id, name: app.name, domain: app.domain ?? "", color: app.color, dataClass: app.dataClass, sortOrder: String(app.sortOrder),
    alertEmail: app.alertEmail ?? "", fromName: app.fromName ?? "", fromAddress: app.fromAddress ?? "", replyTo: app.replyTo ?? "",
    legalName: app.legalName ?? "", postalAddress: app.postalAddress ?? "", smtpHost: app.smtpHost ?? "", smtpPort: app.smtpPort ? String(app.smtpPort) : "",
    smtpUser: app.smtpUser ?? "", recordUrlTemplate: app.recordUrlTemplate ?? "", retentionMonths: app.retentionMonths ? String(app.retentionMonths) : "", notes: app.notes ?? "",
  };
  return <>
    {Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
    {app.active && <input type="hidden" name="active" value="on" />}
    {app.campaignsAllowed && <input type="hidden" name="campaignsAllowed" value="on" />}
    {app.smtpSecure && <input type="hidden" name="smtpSecure" value="on" />}
  </>;
}
