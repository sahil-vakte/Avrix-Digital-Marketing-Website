// Turns stored campaign HTML into the final per-recipient email: merge tags,
// tracked links, open pixel, compliant footer, unsubscribe headers, plain text.
import { convert } from "html-to-text";
import { applyMerge, type MergeData } from "./merge";
import { env } from "./env";

export type RenderOptions = {
  bodyHtml: string;
  subject: string;
  data: MergeData;
  token: string;
  trackOpens: boolean;
  trackClicks: boolean;
  includeUnsubscribe: boolean; // false for one-to-one replies & system mail
  linkId?: (url: string) => Promise<string>;
  /** "branded" = Avrix header, card and footer (campaigns, confirmations, alerts).
   *  "letter"   = plain personal-email look (one-to-one replies), so threads read naturally. */
  layout?: "branded" | "letter";
  /** Footer identity for the sending application (defaults to COMPANY_* in .env). */
  company?: { legalName: string; address: string; replyTo?: string | null };
};

export const trackingUrls = (token: string) => ({
  open: `${env.appUrl}/t/o/${token}`,
  click: (linkId: string) => `${env.appUrl}/t/c/${token}?l=${encodeURIComponent(linkId)}`,
  unsubscribe: `${env.appUrl}/u/${token}`,
  oneClick: `${env.appUrl}/api/unsubscribe/${token}`,
});

export async function renderEmail(o: RenderOptions) {
  const urls = trackingUrls(o.token);
  const company = o.company ?? { legalName: env.company.legalName, address: env.company.address, replyTo: env.mail.replyTo };
  const subject = applyMerge(o.subject, o.data).replace(/[\r\n]+/g, " ").trim();
  let body = applyMerge(o.bodyHtml, o.data, true);

  if (o.trackClicks && o.linkId) {
    const hrefs = [...body.matchAll(/href\s*=\s*"(https?:\/\/[^"]+)"/gi)].map((m) => m[1]);
    const map = new Map<string, string>();
    for (const raw of new Set(hrefs)) {
      const url = raw.replace(/&amp;/g, "&");
      if (url.startsWith(env.appUrl + "/u/")) continue;
      map.set(raw, urls.click(await o.linkId(url)));
    }
    body = body.replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (m, u) => (map.has(u) ? `href="${map.get(u)}"` : m));
  }

  const pixel = o.trackOpens ? `<img src="${urls.open}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />` : "";
  const layout = o.layout ?? "branded";
  const html = layout === "letter"
    ? letterHtml({ subject, body, pixel, unsubscribeUrl: o.includeUnsubscribe ? urls.unsubscribe : null, company })
    : brandedHtml({ subject, body, pixel, unsubscribeUrl: o.includeUnsubscribe ? urls.unsubscribe : null, company });

  const textBody = convert(body, { wordwrap: 78, selectors: [{ selector: "a", options: { hideLinkHrefIfSameAsText: true } }, { selector: "img", format: "skip" }] });
  const text = o.includeUnsubscribe
    ? `${textBody}\n\n--\n${company.legalName}${company.address ? ", " + company.address : ""}\nUnsubscribe: ${urls.unsubscribe}\n`
    : textBody;

  const headers: Record<string, string> = {};
  if (o.includeUnsubscribe) {
    const mailto = company.replyTo ? `, <mailto:${company.replyTo}?subject=unsubscribe>` : "";
    headers["List-Unsubscribe"] = `<${urls.oneClick}>${mailto}`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  headers["X-Avrix-Token"] = o.token;
  return { subject, html, text, headers };
}

// ───────────────────────── Email layouts ─────────────────────────
// Table-based, inline-styled and 600px wide so it renders in Gmail, Outlook and Apple Mail.
// No images are required for the design (logo is HTML), so it still looks right with images off.
const BRAND = { name: "Avrix UK & Europe", blue: "#2563eb", cyan: "#22d3ee", navy: "#0a1230", ink: "#0f172a", muted: "#64748b", line: "#e5e9f2", bg: "#f2f5fb" };

type Company = { legalName: string; address: string; replyTo?: string | null };

function complianceFooter(unsubscribeUrl: string | null, dark: boolean, company: Company) {
  const c = dark ? "#94a3b8" : BRAND.muted;
  const addr = `${esc(company.legalName)}${company.address ? " · " + esc(company.address) : ""}`;
  return unsubscribeUrl
    ? `${addr}<br>You are receiving this email because we believe our services are relevant to your business.
<a href="${unsubscribeUrl}" style="color:${c};text-decoration:underline">Unsubscribe</a> and we will not email you again.`
    : addr;
}

function preheader(body: string) {
  const txt = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${txt}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>`;
}

const HEAD_STYLE = `
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{border:0;outline:none;text-decoration:none;max-width:100%;height:auto}
  .em-body p{margin:0 0 16px}
  .em-body h1,.em-body h2{margin:24px 0 12px;font-size:22px;line-height:28px;color:${BRAND.ink};font-weight:700}
  .em-body h3{margin:20px 0 10px;font-size:18px;line-height:24px;color:${BRAND.ink};font-weight:700}
  .em-body ul,.em-body ol{margin:0 0 16px;padding-left:22px}
  .em-body li{margin:0 0 6px}
  .em-body a{color:${BRAND.blue};text-decoration:underline}
  .em-body blockquote{margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid #c7d7fe;color:${BRAND.muted}}
  .em-body img{border-radius:10px}
  @media (max-width:620px){
    .em-wrap{width:100%!important}
    .em-pad{padding:28px 22px!important}
    .em-head{padding:20px 22px!important}
  }
  @media (prefers-color-scheme:dark){
    .em-bg{background:#050a1a!important}
    .em-card{background:#0d1633!important;border-color:#1e2b52!important}
    .em-body,.em-body p,.em-body li{color:#e2e8f0!important}
    .em-body h1,.em-body h2,.em-body h3,.em-brand{color:#ffffff!important}
    .em-body a{color:#7aa2ff!important}
    .em-foot,.em-foot a{color:#94a3b8!important}
  }`;

function brandedHtml({ subject, body, pixel, unsubscribeUrl, company }: { subject: string; body: string; pixel: string; unsubscribeUrl: string | null; company: Company }) {
  // Another application's email carries its own name instead of the Avrix UK & Europe wordmark.
  const ownBrand = company.legalName !== env.company.legalName;
  const site = env.appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `<!doctype html><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(subject)}</title>
<style>${HEAD_STYLE}</style></head>
<body style="margin:0;padding:0;background:${BRAND.bg}">
${preheader(body)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-bg" style="background:${BRAND.bg}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-wrap" style="width:600px;max-width:600px">
    <tr><td class="em-head" style="padding:0 8px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:34px;height:34px;border-radius:9px;background:${BRAND.blue};background-image:linear-gradient(135deg,${BRAND.blue},${BRAND.cyan});text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#ffffff;line-height:34px">${ownBrand ? esc(company.legalName.trim().charAt(0).toUpperCase() || "A") : "A"}</td>
        <td class="em-brand" style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:${BRAND.ink};letter-spacing:-.2px">${ownBrand ? esc(company.legalName) : `Avrix <span style="font-size:10px;letter-spacing:2px;color:#0891b2;text-transform:uppercase">UK &amp; Europe</span>`}</td>
      </tr></table>
    </td></tr>
    <tr><td class="em-card" style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden">
      <div style="height:4px;line-height:4px;font-size:0;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.cyan},#a78bfa);border-radius:16px 16px 0 0">&nbsp;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="em-pad em-body" style="padding:36px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#1f2937">
${body}
        </td>
      </tr></table>
    </td></tr>
    <tr><td class="em-foot" style="padding:22px 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${BRAND.muted};text-align:center">
      ${complianceFooter(unsubscribeUrl, false, company)}
      <br><a href="${env.appUrl}" style="color:${BRAND.muted};text-decoration:none">${esc(site)}</a>
    </td></tr>
  </table>
</td></tr>
</table>${pixel}</body></html>`;
}

function letterHtml({ subject, body, pixel, unsubscribeUrl, company }: { subject: string; body: string; pixel: string; unsubscribeUrl: string | null; company: Company }) {
  const footer = unsubscribeUrl
    ? `<p class="em-foot" style="margin:28px 0 0;padding-top:14px;border-top:1px solid ${BRAND.line};font-size:12px;line-height:18px;color:${BRAND.muted}">${complianceFooter(unsubscribeUrl, false, company)}</p>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(subject)}</title><style>${HEAD_STYLE}</style></head>
<body style="margin:0;padding:0;background:#ffffff">
<div class="em-body" style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#111827">
${body}
${footer}
</div>${pixel}</body></html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
