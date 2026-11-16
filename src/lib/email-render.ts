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
};

export const trackingUrls = (token: string) => ({
  open: `${env.appUrl}/t/o/${token}`,
  click: (linkId: string) => `${env.appUrl}/t/c/${token}?l=${encodeURIComponent(linkId)}`,
  unsubscribe: `${env.appUrl}/u/${token}`,
  oneClick: `${env.appUrl}/api/unsubscribe/${token}`,
});

export async function renderEmail(o: RenderOptions) {
  const urls = trackingUrls(o.token);
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

  const footer = o.includeUnsubscribe
    ? `<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;line-height:18px;color:#6b7280">
${esc(env.company.legalName)}${env.company.address ? " · " + esc(env.company.address) : ""}<br>
You are receiving this email because we believe our services are relevant to your business.
<a href="${urls.unsubscribe}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a> and we will not email you again.</p>`
    : "";
  const pixel = o.trackOpens ? `<img src="${urls.open}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />` : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#111827">
${body}
${footer}
</div>${pixel}</body></html>`;

  const textBody = convert(body, { wordwrap: 78, selectors: [{ selector: "a", options: { hideLinkHrefIfSameAsText: true } }, { selector: "img", format: "skip" }] });
  const text = o.includeUnsubscribe
    ? `${textBody}\n\n--\n${env.company.legalName}${env.company.address ? ", " + env.company.address : ""}\nUnsubscribe: ${urls.unsubscribe}\n`
    : textBody;

  const headers: Record<string, string> = {};
  if (o.includeUnsubscribe) {
    const mailto = env.mail.replyTo ? `, <mailto:${env.mail.replyTo}?subject=unsubscribe>` : "";
    headers["List-Unsubscribe"] = `<${urls.oneClick}>${mailto}`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  headers["X-Avrix-Token"] = o.token;
  return { subject, html, text, headers };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
