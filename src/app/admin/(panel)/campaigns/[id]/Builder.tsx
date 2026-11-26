import Link from "next/link";
import { asc, eq, isNull, or } from "drizzle-orm";
import { db, t } from "@/db";
import type { Campaign } from "@/db/schema";
import { previewAudience } from "@/lib/audience";
import { capacity, throughputPerDay } from "@/lib/caps";
import { spamCheck } from "@/lib/spam-check";
import { getSetting } from "@/lib/settings";
import { listMergeTags } from "@/lib/merge";
import { fmtInTz } from "@/lib/time";
import { env } from "@/lib/env";
import { Badge, Card } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { RichEditor } from "@/components/admin/RichEditor";
import { addStep, deleteStep, launchCampaign, saveAudience, saveContent, saveDetails, saveSchedule, saveStep, sendTest, setCampaignStatus } from "../actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KNOWN_TAGS = ["first_name", "last_name", "full_name", "business_name", "email", "city", "country", "job_title", "website", "phone"];

export async function Builder({ c, role, userEmail, previewContact }: { c: Campaign; role: string; userEmail: string; previewContact?: string }) {
  const [lists, steps, audience, cap, comp, sample] = await Promise.all([
    db.select().from(t.lists).where(c.applicationId ? or(eq(t.lists.applicationId, c.applicationId), isNull(t.lists.applicationId)) : undefined).orderBy(asc(t.lists.name)),
    db.select().from(t.sequenceSteps).where(eq(t.sequenceSteps.campaignId, c.id)).orderBy(asc(t.sequenceSteps.order)),
    previewAudience(c.listIds, c.applicationId),
    capacity(),
    getSetting("compliance"),
    db.select({ id: t.contacts.id, email: t.contacts.email }).from(t.contacts).limit(20),
  ]);
  const spam = spamCheck(c.subjectA, c.html);
  const unknownTags = listMergeTags(c.subjectA + c.html + steps.map((s) => s.html + (s.subject ?? "")).join("")).filter((x) => !KNOWN_TAGS.includes(x) && !x.startsWith("custom."));
  const totalEmails = audience.eligible * (1 + steps.length);
  const perDay = throughputPerDay(cap.dailyCap);
  const days = Math.ceil(audience.eligible / perDay);
  const sched = c.scheduledAt ? fmtInTz(c.scheduledAt, "Europe/London", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
  const schedValue = sched ? `${sched.slice(6, 10)}-${sched.slice(3, 5)}-${sched.slice(0, 2)}T${sched.slice(12, 17)}` : "";
  const ready = !!c.subjectA.trim() && !!c.html.replace(/<[^>]+>/g, "").trim() && c.listIds.length > 0 && audience.eligible > 0;
  const needsApproval = role !== "ADMIN" && comp.requireApprovalForStaff;

  const Step = ({ n, id, title, done }: { n: number; id: string; title: string; done: boolean }) => (
    <a href={`#${id}`} className="flex items-center gap-2 text-sm"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-green-600 text-white" : "bg-gray-200"}`}>{done ? "✓" : n}</span>{title}</a>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
      <nav className="sticky top-6 hidden h-fit space-y-3 rounded-2xl border border-gray-200 bg-white p-4 xl:block">
        <Step n={1} id="details" title="Details" done={!!c.name} />
        <Step n={2} id="audience" title="Audience" done={c.listIds.length > 0} />
        <Step n={3} id="content" title="Content" done={!!c.subjectA && !!c.html} />
        <Step n={4} id="followups" title="Follow-ups" done={steps.length > 0} />
        <Step n={5} id="schedule" title="Schedule" done />
        <Step n={6} id="review" title="Review & launch" done={false} />
      </nav>
      <div className="space-y-6">
        <Card title="1. Details"><div id="details" className="scroll-mt-6" />
          <form action={saveDetails} className="grid gap-3 sm:grid-cols-3"><input type="hidden" name="id" value={c.id} />
            <label><span className="label">Campaign name</span><input name="name" defaultValue={c.name} required className="input" /></label>
            <label><span className="label">From name</span><input name="fromName" defaultValue={c.fromName} required className="input" /></label>
            <label><span className="label">Reply-to</span><input name="replyTo" type="email" defaultValue={c.replyTo ?? ""} placeholder={env.mail.replyTo} className="input" /></label>
            <p className="text-xs text-ink-500 sm:col-span-3">Sent from <b>{env.mail.fromAddress}</b> (set in <code>.env</code>).</p>
            <div><SubmitButton className="btn-ghost">Save details</SubmitButton></div>
          </form>
        </Card>

        <Card title="2. Audience"><div id="audience" className="scroll-mt-6" />
          <form action={saveAudience} className="space-y-3"><input type="hidden" name="id" value={c.id} />
            <div className="grid max-h-64 gap-1 overflow-auto rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
              {lists.map((l) => <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="listIds" value={l.id} defaultChecked={c.listIds.includes(l.id)} />{l.name} <Badge tone={l.type === "SEGMENT" ? "violet" : "blue"}>{l.type}</Badge></label>)}
            </div>
            <SubmitButton className="btn-ghost">Save audience</SubmitButton>
          </form>
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
            <p><b>{audience.total.toLocaleString("en-GB")}</b> contacts in the selected lists → <b className="text-green-700">{audience.eligible.toLocaleString("en-GB")} will be emailed</b>.</p>
            {audience.excluded.length > 0 && <ul className="mt-2 space-y-1 text-xs text-ink-700">{audience.excluded.map((e) => <li key={e.reason}>• {e.count.toLocaleString("en-GB")} excluded — {e.reason}</li>)}</ul>}
          </div>
        </Card>

        <Card title="3. Content"><div id="content" className="scroll-mt-6" />
          <div className="grid gap-6 2xl:grid-cols-2">
            <form action={saveContent} className="space-y-3"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="campaignName" value={c.name} />
              <label className="block"><span className="label">Subject line (A)</span><input name="subjectA" defaultValue={c.subjectA} required className="input" placeholder="Quick question about {{business_name}}" /></label>
              <details className="rounded-lg border border-gray-200 p-3" open={!!c.subjectB}><summary className="cursor-pointer text-sm font-semibold">A/B test a second subject line</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className="label">Subject line (B) — leave empty for no test</span><input name="subjectB" defaultValue={c.subjectB ?? ""} className="input" /></label>
                  <label><span className="label">Test slice (% of audience)</span><input name="abTestPercent" type="number" min={10} max={50} defaultValue={c.abTestPercent} className="input" /></label>
                  <label><span className="label">Pick winner by</span><select name="abWinnerMetric" defaultValue={c.abWinnerMetric} className="input"><option value="open">Open rate</option><option value="reply">Reply rate</option></select></label>
                  <label><span className="label">Wait before choosing (hours)</span><input name="abWaitHours" type="number" min={1} max={72} defaultValue={c.abWaitHours} className="input" /></label>
                </div></details>
              <RichEditor name="html" initial={c.html} mergeTags />
              <p className="text-xs text-ink-500">Use fallbacks like {"{{first_name|there}}"}. An unsubscribe link and your company address are added to every email automatically.</p>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="saveAsTemplate" /> Also save as a template</label>
              <SubmitButton>Save content</SubmitButton>
            </form>
            <div className="space-y-3">
              <div className={`rounded-lg p-3 text-sm ${spam.warnings.length ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>
                <p className="font-semibold">Deliverability check: {spam.score}/10</p>
                {spam.warnings.length ? <ul className="mt-1 list-disc pl-5 text-xs">{spam.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="text-xs">No obvious spam triggers.</p>}
                {unknownTags.length > 0 && <p className="mt-2 text-xs text-red-700">Unknown merge tags: {unknownTags.map((x) => `{{${x}}}`).join(", ")}</p>}
              </div>
              <form className="flex gap-2" action={`/admin/campaigns/${c.id}`} method="get">
                <select name="previewContact" className="input" defaultValue={previewContact ?? ""}><option value="">Preview with sample data</option>{sample.map((s) => <option key={s.id} value={s.id}>{s.email}</option>)}</select>
                <button className="btn-ghost btn-sm">Preview</button>
              </form>
              <PreviewFrame id={c.id} contact={previewContact} />
              <form action={sendTest} className="flex gap-2"><input type="hidden" name="id" value={c.id} />
                <input name="to" type="email" defaultValue={userEmail} className="input" /><SubmitButton className="btn-ghost btn-sm" pendingText="Sending…">Send test</SubmitButton></form>
            </div>
          </div>
        </Card>

        <Card title="4. Follow-ups (optional)" actions={steps.length < 3 ? <form action={addStep}><input type="hidden" name="id" value={c.id} /><SubmitButton className="btn-ghost btn-sm">+ Add follow-up</SubmitButton></form> : null}>
          <div id="followups" className="scroll-mt-6" />
          <p className="mb-4 text-sm text-ink-500">Follow-ups are sent in the same email thread and stop automatically for anyone who replies, unsubscribes or bounces.</p>
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 p-4">
                <form action={saveStep} className="space-y-3"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="stepId" value={s.id} />
                  <div className="flex flex-wrap items-end gap-3">
                    <p className="font-semibold">Follow-up {s.order}</p>
                    <label className="flex items-center gap-2 text-sm">Send <input name="delayDays" type="number" min={1} max={60} defaultValue={s.delayDays} className="input w-20" /> days after the previous email</label>
                  </div>
                  <label className="block"><span className="label">Subject (empty = “Re: original subject”, same thread)</span><input name="subject" defaultValue={s.subject ?? ""} className="input" /></label>
                  <RichEditor name="html" initial={s.html} mergeTags minHeight={120} />
                  <div className="flex gap-2"><SubmitButton className="btn-ghost btn-sm">Save follow-up</SubmitButton>
                    <a href={`/admin/campaigns/${c.id}/preview?step=${s.order}`} target="_blank" className="btn-ghost btn-sm">Preview</a></div>
                </form>
                <form action={deleteStep} className="mt-2"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="stepId" value={s.id} /><ConfirmButton className="text-xs text-red-600" message="Delete this follow-up?">Delete</ConfirmButton></form>
              </div>
            ))}
            {!steps.length && <p className="text-sm text-ink-500">No follow-ups. Most replies to cold email come from the 2nd or 3rd message.</p>}
          </div>
        </Card>

        <Card title="5. Schedule & tracking"><div id="schedule" className="scroll-mt-6" />
          <form action={saveSchedule} className="space-y-4"><input type="hidden" name="id" value={c.id} />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="mode" value="now" defaultChecked={!c.scheduledAt} /> Start as soon as I launch</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" value="later" defaultChecked={!!c.scheduledAt} /> Start at</label>
              <input type="datetime-local" name="when" defaultValue={schedValue} className="input w-56" /><span className="text-xs text-ink-500">UK time</span>
            </div>
            <div><span className="label">Send window</span>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" name="sendDays" value={i + 1} defaultChecked={c.sendDays.includes(i + 1)} />{d}</label>)}
                <span>between</span><select name="sendStartHour" defaultValue={c.sendStartHour} className="input w-24">{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select>
                <span>and</span><select name="sendEndHour" defaultValue={c.sendEndHour} className="input w-24">{Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{String(h + 1).padStart(2, "0")}:00</option>)}</select>
              </div></div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="useRecipientTz" defaultChecked={c.useRecipientTz} /> Use each recipient's time zone (from their country)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="trackOpens" defaultChecked={c.trackOpens} /> Track opens</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="trackClicks" defaultChecked={c.trackClicks} /> Track clicks</label>
            </div>
            <SubmitButton className="btn-ghost">Save schedule</SubmitButton>
          </form>
        </Card>

        <Card title="6. Review & launch"><div id="review" className="scroll-mt-6" />
          <ul className="space-y-2 text-sm">
            <li>📨 <b>{audience.eligible.toLocaleString("en-GB")}</b> recipients · {steps.length} follow-up(s) · up to <b>{totalEmails.toLocaleString("en-GB")}</b> emails in total</li>
            <li>⏱ Sending capacity: {cap.dailyCap}/day{cap.warmupDay ? ` (warm-up day ${cap.warmupDay})` : ""}, {cap.hourlyCap}/hour, {env.send.minGap}–{env.send.maxGap}s between emails → initial emails take about <b>{days} day{days === 1 ? "" : "s"}</b>{c.subjectB ? " plus the A/B wait" : ""}.</li>
            <li>📅 {c.scheduledAt ? `Starts ${fmtInTz(c.scheduledAt, "Europe/London", { dateStyle: "medium", timeStyle: "short" })} UK` : "Starts when launched"} · {c.sendDays.map((d) => DAYS[d - 1]).join(", ")} {c.sendStartHour}:00–{c.sendEndHour}:00 {c.useRecipientTz ? "recipient time" : "UK time"}</li>
            <li>{c.subjectB ? `🧪 A/B test on ${c.abTestPercent}% of the audience, winner by ${c.abWinnerMetric} rate after ${c.abWaitHours}h` : "No A/B test"}</li>
            <li>🛡 Unsubscribe link, one-click unsubscribe header and company address are added automatically; suppressed and non-compliant contacts are excluded.</li>
          </ul>
          {cap.dailyCap > 0 && totalEmails > cap.dailyCap * 5 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This campaign is large compared with your daily cap. Keep cold volume per mailbox modest and watch bounce rates — Google may suspend accounts that send unsolicited bulk email.</p>}
          <form action={launchCampaign} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="id" value={c.id} />
            {c.status === "PENDING_APPROVAL" && role !== "ADMIN" ? <p className="text-sm text-amber-700">Waiting for an administrator to approve.</p> :
              <ConfirmButton className="btn-primary" message={`Launch “${c.name}” to ${audience.eligible} recipients? This cannot be undone (you can pause it).`}>
                {c.status === "PENDING_APPROVAL" ? "Approve & launch" : needsApproval ? "Submit for approval" : c.scheduledAt ? "Schedule campaign" : "Launch campaign"}
              </ConfirmButton>}
            {!ready && <span className="self-center text-xs text-red-600">Add a subject, content and at least one list with eligible contacts.</span>}
          </form>
          {c.status === "PENDING_APPROVAL" && role === "ADMIN" && <form action={setCampaignStatus} className="mt-2"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="reject" /><SubmitButton className="btn-ghost btn-sm">Send back to draft</SubmitButton></form>}
        </Card>
        <p className="text-xs text-ink-500"><Link href="/admin/campaigns" className="underline">Back to campaigns</Link></p>
      </div>
    </div>
  );
}

function PreviewFrame({ id, contact }: { id: string; contact?: string }) {
  return <iframe src={`/admin/campaigns/${id}/preview${contact ? `?contact=${contact}` : ""}`} title="Email preview" className="h-[460px] w-full rounded-lg border border-gray-200 bg-white" />;
}
