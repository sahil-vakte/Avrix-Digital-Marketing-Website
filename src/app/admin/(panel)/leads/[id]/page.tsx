import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { AppBadge, Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { leadForUser, recordUrl, stagesFor, DATA_CLASS_LABEL } from "@/lib/apps";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { fmtDate, money } from "@/lib/utils";
import { countryName } from "@/lib/countries";
import { LeadFields } from "../LeadForm";
import { EmailComposer } from "./EmailComposer";
import { addNote, addTask, deleteLead, mergeLeads, sendLeadEmail, setStage, toggleTask, updateLead } from "../actions";

export const metadata = { title: "Lead" };

const ICON: Record<string, string> = { form: "📝", stage_change: "➡️", email_sent: "📤", email_queued: "🕒", email_open: "👁", email_click: "🔗", email_reply: "💬", meeting: "📅", task: "✅", note: "🗒", unsubscribe: "🚫", merge: "🔀", created: "➕" };

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  await leadForUser(user, id); // 404 unless this user may see the lead's application
  const lead = await db.query.leads.findFirst({
    where: eq(t.leads.id, id),
    with: { application: true, stage: true, owner: true, contact: true, notes: { with: { author: true }, orderBy: desc(t.notes.createdAt) }, tasks: { with: { assignee: true }, orderBy: asc(t.tasks.dueAt) }, activities: { orderBy: desc(t.activities.createdAt), limit: 200 }, bookings: { orderBy: desc(t.bookings.startsAt) } },
  });
  if (!lead) notFound();
  const domain = lead.email.split("@")[1] ?? "";
  const freeMail = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "hotmail.co.uk", "yahoo.co.uk", "live.com", "aol.com", "btinternet.com"].includes(domain);
  const [stages, users, messages, templates, dupes, suppressed] = await Promise.all([
    stagesFor(lead.applicationId),
    db.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.active, true)),
    lead.email ? db.query.emailMessages.findMany({ where: and(eq(t.emailMessages.toEmail, lead.email), ne(t.emailMessages.kind, "SYSTEM")), with: { campaign: true }, orderBy: desc(t.emailMessages.createdAt), limit: 50 }) : Promise.resolve([]),
    db.select().from(t.templates).where(or(eq(t.templates.applicationId, lead.applicationId), isNull(t.templates.applicationId))).orderBy(asc(t.templates.name)),
    lead.email ? db.select().from(t.leads).where(and(ne(t.leads.id, id), eq(t.leads.applicationId, lead.applicationId), or(ilike(t.leads.email, lead.email), freeMail || !domain ? undefined : ilike(t.leads.email, `%@${domain}`)))).limit(5) : Promise.resolve([]),
    lead.email ? db.query.suppressions.findFirst({ where: eq(t.suppressions.email, lead.email) }) : Promise.resolve(undefined),
  ]);
  const timeline = [
    ...lead.activities.map((a) => ({ at: a.createdAt, icon: ICON[a.type] ?? "•", text: a.summary, extra: (a.metadata as { text?: string; message?: string } | null)?.text ?? (a.metadata as { message?: string } | null)?.message })),
    ...lead.notes.map((n) => ({ at: n.createdAt, icon: "🗒", text: `Note by ${n.author?.name ?? "someone"}`, extra: n.body })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const utm = (lead.utm ?? {}) as Record<string, string>;
  const custom = Object.entries((lead.customFields ?? {}) as Record<string, unknown>).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  const sourceLink = recordUrl(lead.application, lead.externalId, lead.externalUrl);
  const health = lead.application.dataClass === "HEALTH";

  return (
    <div>
      <PageHeader title={lead.name} sub={<><AppBadge app={lead.application} className="mr-2 align-middle" />{lead.businessName && <>{lead.businessName} · </>}{lead.email && <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>}{lead.phone && <> · <a href={`tel:${lead.phone}`}>{lead.phone}</a></>}</>}
        actions={<>
          <form action={setStage} className="flex gap-2"><input type="hidden" name="id" value={lead.id} />
            <select name="stageId" defaultValue={lead.stageId} className="input w-44">{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <SubmitButton className="btn-ghost">Move</SubmitButton></form>
          {sourceLink && <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open in {lead.application.name} ↗</a>}
          <Link href="/admin/leads" className="btn-ghost">Back</Link>
        </>} />
      <Flash ok={sp.ok} error={sp.error} />
      {health && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>Health data.</b> This enquiry came from {lead.application.name}. Use it only to respond to the enquiry; it is excluded from campaigns and contact lists.</p>}
      {suppressed && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This address is on the suppression list ({suppressed.reason.toLowerCase().replace("_", " ")}). Campaign emails will not be sent.</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Email" actions={<span className="text-xs text-ink-500">From {lead.application.fromAddress ?? "your outreach mailbox"}</span>}>
            <EmailComposer leadId={lead.id} action={sendLeadEmail} defaultSubject={lead.service ? `Your enquiry about ${lead.service.toLowerCase()}` : "Following up"} templates={templates} />
          </Card>
          <Card title="Activity">
            <form action={addNote} className="mb-4 flex gap-2"><input type="hidden" name="leadId" value={lead.id} />
              <textarea name="body" rows={2} placeholder="Add a note…" className="input" required /><SubmitButton className="btn-primary self-end">Add</SubmitButton></form>
            <ol className="space-y-4">
              {timeline.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 text-lg leading-none" aria-hidden>{e.icon}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm">{e.text}</p><p className="text-xs text-ink-500">{fmtDate(e.at, true)}</p>
                    {e.extra && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm text-ink-700">{String(e.extra).slice(0, 1500)}</p>}</div>
                </li>
              ))}
              {!timeline.length && <p className="text-sm text-ink-500">No activity yet.</p>}
            </ol>
          </Card>
          <Card title="Emails to this address">
            {messages.length ? <table className="table-x"><thead><tr><th>Subject</th><th>Type</th><th>Status</th><th>Opens</th><th>Clicks</th><th>Sent</th></tr></thead><tbody>
              {messages.map((m) => <tr key={m.id}><td>{m.subject}{m.campaign && <div className="text-xs"><Link href={`/admin/campaigns/${m.campaign.id}`} className="text-brand-600 hover:underline">{m.campaign.name}</Link></div>}</td><td className="text-xs">{m.kind.toLowerCase().replace("_", " ")}</td><td><Badge>{m.status}</Badge></td><td>{m.openCount}</td><td>{m.clickCount}</td><td className="text-xs text-ink-500">{fmtDate(m.sentAt, true)}</td></tr>)}
            </tbody></table> : <p className="text-sm text-ink-500">No emails sent yet.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Summary">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-500">Application</dt><dd><AppBadge app={lead.application} /></dd>
              <dt className="text-ink-500">Data type</dt><dd>{DATA_CLASS_LABEL[lead.application.dataClass]}</dd>
              <dt className="text-ink-500">Stage</dt><dd><Badge tone="blue">{lead.stage.name}</Badge></dd>
              <dt className="text-ink-500">Priority</dt><dd className="capitalize">{lead.priority}</dd>
              {lead.externalId && <><dt className="text-ink-500">Source record</dt><dd className="truncate">{sourceLink ? <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">#{lead.externalId}</a> : `#${lead.externalId}`}</dd></>}
              <dt className="text-ink-500">Value</dt><dd>{money(lead.value, lead.currency)}</dd>
              <dt className="text-ink-500">Source</dt><dd>{lead.source.replace(/_/g, " ").toLowerCase()}</dd>
              <dt className="text-ink-500">Country</dt><dd>{countryName(lead.country)}</dd>
              <dt className="text-ink-500">Service</dt><dd>{lead.service ?? "—"}</dd>
              <dt className="text-ink-500">Budget</dt><dd>{lead.budget ?? "—"}</dd>
              <dt className="text-ink-500">Owner</dt><dd>{lead.owner?.name ?? "Unassigned"}</dd>
              <dt className="text-ink-500">Created</dt><dd>{fmtDate(lead.createdAt, true)}</dd>
              {lead.contact && <><dt className="text-ink-500">Contact</dt><dd><Link href={`/admin/contacts/${lead.contact.id}`} className="text-brand-600 hover:underline">View contact</Link></dd></>}
            </dl>
            {Object.keys(utm).length > 0 && <div className="mt-4 border-t pt-3"><p className="label">Attribution</p><dl className="grid grid-cols-2 gap-y-1 text-xs">{Object.entries(utm).map(([k, v]) => <><dt key={k} className="text-ink-500">{k}</dt><dd className="truncate" title={v}>{v}</dd></>)}</dl></div>}
            {custom.length > 0 && <div className="mt-4 border-t pt-3"><p className="label">Details from {lead.application.name}</p><dl className="grid grid-cols-2 gap-y-1 text-xs">{custom.map(([k, v]) => <Fragment key={k}><dt className="text-ink-500">{k.replace(/[_-]+/g, " ")}</dt><dd className="break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></Fragment>)}</dl></div>}
            {lead.message && <div className="mt-4 border-t pt-3"><p className="label">Original message</p><p className="whitespace-pre-wrap text-sm">{lead.message}</p></div>}
          </Card>
          <Card title="Tasks">
            <ul className="mb-3 space-y-2">{lead.tasks.map((tk) => (
              <li key={tk.id} className="flex items-start gap-2 text-sm"><form action={toggleTask}><input type="hidden" name="id" value={tk.id} /><button className={`mt-0.5 h-4 w-4 rounded border ${tk.done ? "border-green-600 bg-green-600" : "border-gray-300"}`} aria-label="Toggle task" /></form>
                <span className={tk.done ? "text-ink-300 line-through" : ""}>{tk.title}<span className="block text-xs text-ink-500">{fmtDate(tk.dueAt)}{tk.assignee ? ` · ${tk.assignee.name}` : ""}</span></span></li>
            ))}</ul>
            <form action={addTask} className="space-y-2"><input type="hidden" name="leadId" value={lead.id} />
              <input name="title" placeholder="New task, e.g. Call back" className="input" required />
              <div className="flex gap-2"><input name="dueAt" type="date" className="input" /><select name="assigneeId" className="input" defaultValue={user.id}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <SubmitButton className="btn-ghost btn-sm">Add task</SubmitButton></form>
          </Card>
          {lead.bookings.length > 0 && <Card title="Calls">{lead.bookings.map((b) => <p key={b.id} className="text-sm">{fmtDate(b.startsAt, true)} <Badge>{b.status}</Badge></p>)}</Card>}
          {dupes.length > 0 && <Card title="Possible duplicates">
            <ul className="space-y-2 text-sm">{dupes.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2"><Link href={`/admin/leads/${d.id}`} className="hover:underline">{d.name} <span className="text-xs text-ink-500">{d.email}</span></Link>
                <form action={mergeLeads}><input type="hidden" name="keepId" value={lead.id} /><input type="hidden" name="dropId" value={d.id} /><ConfirmButton className="btn-ghost btn-sm" message={`Merge ${d.name} into this lead? Its notes, tasks and history move here and the duplicate is deleted.`}>Merge here</ConfirmButton></form></li>
            ))}</ul></Card>}
          <Card title="Edit details">
            <form action={updateLead} className="space-y-3"><input type="hidden" name="id" value={lead.id} />
              <LeadFields lead={lead} users={users} /><SubmitButton>Save</SubmitButton></form>
            {user.role === "ADMIN" && <form action={deleteLead} className="mt-4 border-t pt-4"><input type="hidden" name="id" value={lead.id} /><ConfirmButton message="Delete this lead and its history? This cannot be undone.">Delete lead</ConfirmButton></form>}
          </Card>
        </div>
      </div>
    </div>
  );
}
