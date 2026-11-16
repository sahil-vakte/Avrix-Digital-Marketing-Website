"use client";
import { useState } from "react";
import { RichEditor } from "@/components/admin/RichEditor";
import { SubmitButton } from "@/components/admin/buttons";

export function EmailComposer({ leadId, action, defaultSubject, templates }: {
  leadId: string; action: (fd: FormData) => void; defaultSubject: string; templates: { id: string; name: string; subject: string; html: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<{ subject: string; html: string } | null>(null);
  const [k, setK] = useState(0);
  if (!open) return <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>Write email</button>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      {templates.length > 0 && (
        <select className="input" defaultValue="" onChange={(e) => { const x = templates.find((t) => t.id === e.target.value); if (x) { setTpl(x); setK(k + 1); } }}>
          <option value="">Start from a template…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <input key={`s${k}`} name="subject" required defaultValue={tpl?.subject ?? defaultSubject} placeholder="Subject" className="input" />
      <RichEditor key={`e${k}`} name="html" initial={tpl?.html ?? ""} minHeight={160} />
      <p className="text-xs text-ink-500">Sent from your outreach mailbox, tracked for opens and clicks. Merge tags such as {"{{first_name}}"} are filled from this lead.</p>
      <div className="flex gap-2"><SubmitButton pendingText="Queuing…">Send</SubmitButton><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
