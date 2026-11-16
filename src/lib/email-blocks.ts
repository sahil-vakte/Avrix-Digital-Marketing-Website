// Small, email-client-safe building blocks for system emails (inline styles only).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A highlighted details panel, e.g. booking time, lead info. Values must already be escaped. */
export function infoBox(rows: [label: string, valueHtml: string][]) {
  const tr = rows.map(([k, v], i) => `<tr>
<td style="padding:${i ? "10px" : "0"} 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#64748b;text-transform:uppercase;letter-spacing:1px">${esc(k)}</td></tr>
<tr><td style="padding:2px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#0f172a;font-weight:700">${v}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td style="background:#f2f6ff;border:1px solid #dbe5ff;border-left:4px solid #2563eb;border-radius:12px;padding:16px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${tr}</table></td></tr></table>`;
}

/** A bulletproof call-to-action button. */
export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr>
<td style="border-radius:10px;background:#2563eb;background-image:linear-gradient(90deg,#2563eb,#4f7cff)">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
</td></tr></table>`;
}
