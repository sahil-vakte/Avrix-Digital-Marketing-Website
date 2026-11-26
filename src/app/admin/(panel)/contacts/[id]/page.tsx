import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { canSeeApplication } from "@/lib/apps";
import { eligibilityContext } from "@/lib/audience";
import { ineligibleReason } from "@/lib/compliance";
import { Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { ContactFields } from "../ContactFields";
import { eraseContact, setMembership, updateContact } from "../actions";

export const metadata = { title: "Contact" };

export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const c = await db.query.contacts.findFirst({ where: eq(t.contacts.id, id), with: { lists: { with: { list: true } }, leads: true } });
  if (c && !(await canSeeApplication(user, c.applicationId))) notFound();
  if (!c) notFound();
  const [allLists, recipients, ctx, sup] = await Promise.all([
    db.select().from(t.lists).where(eq(t.lists.type, "STATIC")).orderBy(asc(t.lists.name)),
    db.query.campaignRecipients.findMany({ where: eq(t.campaignRecipients.email, c.email), with: { campaign: true }, orderBy: desc(t.campaignRecipients.createdAt) }),
    eligibilityContext(),
    db.query.suppressions.findFirst({ where: eq(t.suppressions.email, c.email) }),
  ]);
  const reason = ineligibleReason(c, ctx);
  const memberIds = new Set(c.lists.map((l) => l.listId));
  return (
    <div>
      <PageHeader title={c.email} sub={`${c.businessName}${c.firstName ? ` · ${c.firstName} ${c.lastName ?? ""}` : ""}`} actions={<Link href="/admin/contacts" className="btn-ghost">Back</Link>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className={`mb-4 rounded-lg p-3 text-sm ${reason ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>
        {reason ? <>Campaign emails <b>will not</b> be sent: {reason}.</> : <>Eligible for campaign emails ({c.consentStatus === "OPTED_IN" ? "opted in" : "corporate subscriber, legitimate interests"}).</>}
        {sup && <> Suppressed since {fmtDate(sup.createdAt)} ({sup.reason.toLowerCase().replace("_", " ")}).</>}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Details" className="xl:col-span-2">
          <form action={updateContact} className="space-y-4"><input type="hidden" name="id" value={c.id} />
            <ContactFields c={c} /><SubmitButton>Save</SubmitButton></form>
        </Card>
        <div className="space-y-6">
          <Card title="Status">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-500">Email status</dt><dd><Badge>{c.emailStatus}</Badge> {c.emailFlags.join(", ")}</dd>
              <dt className="text-ink-500">Consent</dt><dd><Badge>{c.consentStatus}</Badge></dd>
              <dt className="text-ink-500">Consent date</dt><dd>{fmtDate(c.consentAt)}</dd>
              <dt className="text-ink-500">Last emailed</dt><dd>{fmtDate(c.lastEmailedAt, true)}</dd>
              <dt className="text-ink-500">Last engaged</dt><dd>{fmtDate(c.lastEngagedAt, true)}</dd>
              <dt className="text-ink-500">Added</dt><dd>{fmtDate(c.createdAt)}</dd>
            </dl>
            {c.leads.map((l) => <Link key={l.id} href={`/admin/leads/${l.id}`} className="btn-ghost btn-sm mt-3">Open lead →</Link>)}
          </Card>
          <Card title="Lists">
            <ul className="space-y-1 text-sm">{c.lists.map((m) => (
              <li key={m.listId} className="flex items-center justify-between"><Link href={`/admin/lists/${m.listId}`} className="hover:underline">{m.list.name}</Link>
                <form action={setMembership}><input type="hidden" name="contactId" value={c.id} /><input type="hidden" name="listId" value={m.listId} /><input type="hidden" name="op" value="remove" /><button className="text-xs text-red-600">Remove</button></form></li>
            ))}</ul>
            <form action={setMembership} className="mt-3 flex gap-2"><input type="hidden" name="contactId" value={c.id} />
              <select name="listId" className="input" required>{allLists.filter((l) => !memberIds.has(l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              <SubmitButton className="btn-ghost btn-sm">Add</SubmitButton></form>
          </Card>
          <Card title="Campaign history">
            {recipients.length ? <ul className="space-y-2 text-sm">{recipients.map((r) => (
              <li key={r.id}><Link href={`/admin/campaigns/${r.campaignId}/recipients/${r.id}`} className="hover:underline">{r.campaign.name}</Link> <Badge>{r.status}</Badge>
                <span className="block text-xs text-ink-500">{r.openCount} opens · {r.clickCount} clicks{r.excludeReason ? ` · ${r.excludeReason}` : ""}</span></li>
            ))}</ul> : <p className="text-sm text-ink-500">Not in any campaign yet.</p>}
          </Card>
          <Card title="Data protection">
            <p className="mb-3 text-xs text-ink-500">Respond to subject access and erasure requests.</p>
            <a href={`/admin/export/contact-data/${c.id}`} className="btn-ghost btn-sm">Export all data (JSON)</a>
            {user.role === "ADMIN" && <form action={eraseContact} className="mt-3"><input type="hidden" name="id" value={c.id} />
              <ConfirmButton message="Erase this person's data? The contact and linked leads are deleted, and the address is kept on the suppression list so they are never emailed again.">Erase personal data</ConfirmButton></form>}
          </Card>
        </div>
      </div>
    </div>
  );
}
