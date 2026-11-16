"use client";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/admin/buttons";
import { COUNTRIES } from "@/lib/countries";
import { TARGET_FIELDS } from "@/lib/import-fields";

const BT = [["LIMITED_COMPANY", "Limited company"], ["LLP", "LLP"], ["PLC", "PLC"], ["PUBLIC_BODY", "Public body"], ["SOLE_TRADER", "Sole trader"], ["PARTNERSHIP", "Partnership"], ["UNKNOWN", "Unknown"]];
const EDIT_LIMIT = 1000;

export function ImportMapper({ jobId, fileName, kind, headers, rows: initialRows, total, initialMapping, templates, lists, action }: {
  jobId: string; fileName: string; kind: string; headers: string[]; rows: string[][]; total: number; initialMapping: Record<string, string>;
  templates: { name: string; mapping: Record<string, string> }[]; lists: { id: string; name: string }[]; action: (fd: FormData) => void;
}) {
  const [mapping, setMapping] = useState(initialMapping);
  const [rows, setRows] = useState(initialRows);
  const [edited, setEdited] = useState(false);
  const [listMode, setListMode] = useState<"existing" | "new" | "none">("new");
  const editable = total <= EDIT_LIMIT;
  const mapped = Object.values(mapping);
  const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
  const emailIssues = useMemo(() => {
    if (emailCol === undefined) return total;
    return rows.filter((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((r[Number(emailCol)] ?? "").trim())).length;
  }, [rows, emailCol, total]);

  const applyTemplate = (name: string) => {
    const tpl = templates.find((t) => t.name === name);
    if (!tpl) return;
    const m: Record<string, string> = {};
    headers.forEach((h, i) => { m[String(i)] = tpl.mapping[h] ?? ""; });
    setMapping(m);
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
      {edited && <input type="hidden" name="rows" value={JSON.stringify(rows)} />}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">2. Map columns — {fileName} ({total.toLocaleString("en-GB")} rows{kind === "pdf" ? ", extracted from PDF" : ""})</h2>
          {templates.length > 0 && <select className="input w-56" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}><option value="">Apply saved mapping…</option>{templates.map((t) => <option key={t.name}>{t.name}</option>)}</select>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {headers.map((h, i) => (
            <label key={i} className="block rounded-lg border border-gray-100 p-2">
              <span className="block truncate text-xs font-semibold" title={h}>{h}</span>
              <span className="block truncate text-[11px] text-ink-500">e.g. {rows.slice(0, 3).map((r) => r[i]).filter(Boolean).join(" · ") || "—"}</span>
              <select className="input mt-1" value={mapping[String(i)] ?? ""} onChange={(e) => setMapping({ ...mapping, [String(i)]: e.target.value })}>
                <option value="">Don't import</option>
                {TARGET_FIELDS.map((f) => <option key={f.key} value={f.key} disabled={mapped.includes(f.key) && mapping[String(i)] !== f.key}>{f.label}</option>)}
                <option value={`custom:${h}`}>Custom field “{h}”</option>
              </select>
            </label>
          ))}
        </div>
        {emailCol === undefined ? <p className="mt-3 text-sm text-red-600">Map one column to Email to continue.</p>
          : emailIssues > 0 && <p className="mt-3 text-sm text-amber-700">{emailIssues} row(s) have a missing or malformed email and will be skipped{editable ? " — fix them in the table below" : ""}.</p>}
        <label className="mt-4 flex items-center gap-2 text-xs"><span>Save this mapping as</span><input name="saveMappingAs" placeholder="e.g. Chamber of Commerce export" className="input w-64" /></label>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold">3. Defaults &amp; compliance</h2>
        <p className="mb-3 text-xs text-ink-500">Used where the file has no value. Consent status matters: contacts with no consent who are sole traders, partnerships, unknown type, or in a country that requires consent will be excluded from campaigns automatically.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label><span className="label">Default country</span><select name="country" className="input" defaultValue="GB">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          <label><span className="label">Default business type</span><select name="businessType" className="input" defaultValue="UNKNOWN">{BT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <span className="text-[11px] text-ink-500">Auto-detected from “Ltd”, “LLP”, “GmbH”… in the business name.</span></label>
          <label><span className="label">Default consent status</span><select name="consentStatus" className="input" defaultValue="NONE">
            <option value="NONE">None recorded</option><option value="LEGITIMATE_INTEREST">Legitimate interest (corporate B2B)</option><option value="OPTED_IN">Opted in (I have consent records)</option></select></label>
          <label><span className="label">Source *</span><input name="source" required defaultValue={`Import: ${fileName}`} className="input" /></label>
          <label><span className="label">Tags to add</span><input name="tags" placeholder="e.g. leicester, retail" className="input" /></label>
          <label><span className="label">Existing contacts</span><select name="duplicateMode" className="input" defaultValue="skip"><option value="skip">Skip (keep existing data)</option><option value="update">Update with file values</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div><span className="label">Add imported contacts to</span>
            <div className="flex gap-3 text-sm">
              {(["new", "existing", "none"] as const).map((m) => <label key={m} className="flex items-center gap-1"><input type="radio" checked={listMode === m} onChange={() => setListMode(m)} />{m === "new" ? "New list" : m === "existing" ? "Existing list" : "No list"}</label>)}
            </div></div>
          {listMode === "new" && <input name="newListName" required defaultValue={fileName.replace(/\.[^.]+$/, "")} className="input w-64" />}
          {listMode === "existing" && <select name="listId" required className="input w-64">{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="checkMx" defaultChecked /> Check mail servers (MX)</label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold">4. Review rows</h2>
        <p className="mb-3 text-xs text-ink-500">{editable ? "Click any cell to correct it before importing." : `Showing the first 50 of ${total.toLocaleString("en-GB")} rows (editing is available for files up to ${EDIT_LIMIT} rows).`}</p>
        <div className="max-h-[480px] overflow-auto rounded-lg border border-gray-100">
          <table className="table-x">
            <thead className="sticky top-0"><tr><th>#</th>{headers.map((h, i) => <th key={i} className={mapping[String(i)] ? "" : "opacity-40"}>{h}<span className="block text-[10px] normal-case text-brand-600">{TARGET_FIELDS.find((f) => f.key === mapping[String(i)])?.label ?? (mapping[String(i)]?.startsWith("custom:") ? "custom" : "")}</span></th>)}{editable && <th></th>}</tr></thead>
            <tbody>{(editable ? rows : rows.slice(0, 50)).map((r, ri) => (
              <tr key={ri}>
                <td className="text-xs text-ink-300">{ri + 2}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className="p-0">
                    {editable ? <input value={r[ci] ?? ""} onChange={(e) => { const next = rows.map((x) => [...x]); next[ri][ci] = e.target.value; setRows(next); setEdited(true); }}
                      className={`w-full min-w-[120px] border-0 bg-transparent px-3 py-2 text-sm focus:bg-brand-50 focus:outline-none ${String(ci) === emailCol && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((r[ci] ?? "").trim()) ? "bg-red-50" : ""}`} />
                      : <span className="block px-3 py-2">{r[ci]}</span>}
                  </td>
                ))}
                {editable && <td><button type="button" className="px-2 text-xs text-red-600" onClick={() => { setRows(rows.filter((_, i) => i !== ri)); setEdited(true); }} aria-label="Remove row">✕</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
      <SubmitButton pendingText="Validating and importing… this can take a minute">Import {(editable ? rows.length : total).toLocaleString("en-GB")} rows</SubmitButton>
    </form>
  );
}
