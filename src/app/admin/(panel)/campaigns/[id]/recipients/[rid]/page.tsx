import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Recipient" };
const LABEL: Record<string, string> = { SENT: "📤 Sent", OPEN: "👁 Opened", CLICK: "🔗 Clicked", REPLY: "💬 Replied", BOUNCE: "⛔ Bounced", UNSUBSCRIBE: "🚫 Unsubscribed", COMPLAINT: "⚠️ Marked as spam" };

export default async function Recipient({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const r = await db.query.campaignRecipients.findFirst({ where: eq(t.campaignRecipients.id, rid), with: { contact: true, campaign: true } });
  if (!r || r.campaignId !== id) notFound();
  const [messages, events] = await Promise.all([
    db.select().from(t.emailMessages).where(eq(t.emailMessages.recipientId, rid)).orderBy(asc(t.emailMessages.stepOrder)),
    db.query.emailEvents.findMany({ where: eq(t.emailEvents.recipientId, rid), with: { link: true, message: true }, orderBy: asc(t.emailEvents.createdAt) }),
  ]);
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.email, r.email) });
  return (
    <div className="max-w-4xl">
      <PageHeader title={r.email} sub={<>{r.contact?.businessName} · <Link href={`/admin/campaigns/${id}`} className="text-brand-600 hover:underline">{r.campaign.name}</Link></>}
        actions={<>{r.contact && <Link href={`/admin/contacts/${r.contact.id}`} className="btn-ghost">Contact</Link>}{lead && <Link href={`/admin/leads/${lead.id}`} className="btn-primary">Lead</Link>}</>} />
      <div className="mb-6 flex flex-wrap gap-2"><Badge>{r.status}</Badge>{r.variant && <Badge tone="violet">{`Variant ${r.variant}`}</Badge>}<span className="text-sm text-ink-500">{r.openCount} opens · {r.clickCount} clicks</span>{r.excludeReason && <span className="text-sm text-amber-700">{r.excludeReason}</span>}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Timeline">
          <ol className="space-y-3">{events.map((e) => (
            <li key={e.id} className="text-sm"><span className={e.machine ? "text-ink-300" : ""}>{LABEL[e.type] ?? e.type}{e.machine ? " (automatic)" : ""}</span>
              <span className="block text-xs text-ink-500">{fmtDate(e.createdAt, true)}{e.message ? ` · ${e.message.stepOrder === 0 ? "initial email" : `follow-up ${e.message.stepOrder}`}` : ""}{e.link ? ` · ${e.link.url}` : ""}</span></li>
          ))}{!events.length && <p className="text-sm text-ink-500">Nothing yet.</p>}</ol>
        </Card>
        <div className="space-y-6">
          <Card title="Emails">
            <table className="table-x"><thead><tr><th>Email</th><th>Status</th><th>Due / sent</th><th>Opens</th></tr></thead><tbody>
              {messages.map((m) => <tr key={m.id}><td className="text-xs">{m.stepOrder === 0 ? "Initial" : `Follow-up ${m.stepOrder}`}<div className="text-ink-500">{m.subject}</div></td><td><Badge>{m.status}</Badge>{m.lastError && <div className="text-[11px] text-ink-500">{m.lastError}</div>}</td><td className="text-xs">{fmtDate(m.sentAt ?? m.scheduledFor, true)}</td><td>{m.openCount}</td></tr>)}
            </tbody></table>
          </Card>
          {r.replySnippet && <Card title="Reply"><p className="whitespace-pre-wrap text-sm">{r.replySnippet}</p></Card>}
        </div>
      </div>
    </div>
  );
}
