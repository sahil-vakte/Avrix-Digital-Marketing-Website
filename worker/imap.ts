// Reads the sending mailbox over IMAP to detect bounces, replies, auto-replies
// and email-based unsubscribes. The mailbox is never modified (no flags changed).
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { and, eq, inArray } from "drizzle-orm";
import { db, t } from "../src/db";
import { env } from "../src/lib/env";
import { getRaw, setSetting } from "../src/lib/settings";
import { addActivity, ensureLead, moveLeadToStageIfEarlier } from "../src/lib/crm";
import { unsubscribeEmail } from "../src/lib/tracking";
import { alertAdmin } from "../src/lib/outbox";
import { markBounced, checkBounceRate } from "./sender";
import { log } from "./log";

type ImapState = { uidValidity: string; lastUid: number };

export async function pollMailbox() {
  if (!env.imap.enabled || !env.imap.user) return;
  const auth = env.smtp.authMode === "oauth2"
    ? { user: env.imap.user, accessToken: await googleAccessToken() }
    : { user: env.imap.user, pass: env.imap.pass };
  const client = new ImapFlow({ host: env.imap.host, port: env.imap.port, secure: env.imap.secure, auth, logger: false });
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mb = client.mailbox as { uidValidity: bigint; uidNext: number };
      const state = await getRaw<ImapState>("imap.state");
      const validity = String(mb.uidValidity);
      let range: string;
      if (!state || state.uidValidity !== validity) {
        // First run (or mailbox reset): look back 3 days.
        const since = new Date(Date.now() - 3 * 86_400_000);
        const uids = (await client.search({ since }, { uid: true })) || [];
        range = uids.length ? `${Math.min(...uids)}:*` : `${mb.uidNext}:*`;
      } else range = `${state.lastUid + 1}:*`;

      let maxUid = state?.uidValidity === validity ? state.lastUid : 0;
      let processed = 0;
      for await (const msg of client.fetch(range, { uid: true, source: true }, { uid: true })) {
        if (state && state.uidValidity === validity && msg.uid <= state.lastUid) continue;
        maxUid = Math.max(maxUid, msg.uid);
        try {
          if (msg.source) await handle(await simpleParser(msg.source));
        } catch (e) {
          log.error("imap message failed", e);
        }
        processed++;
      }
      await setSetting("imap.state", { uidValidity: validity, lastUid: maxUid || mb.uidNext - 1 });
      await setSetting("imap.lastPoll", { at: new Date().toISOString(), processed });
      if (processed) log.info(`imap: processed ${processed} message(s)`);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

const header = (p: ParsedMail, name: string) => {
  const v = p.headers.get(name.toLowerCase());
  return typeof v === "string" ? v : v ? JSON.stringify(v) : "";
};

export function classify(p: ParsedMail): "bounce" | "auto" | "complaint" | "unsubscribe" | "reply" {
  const from = (p.from?.value?.[0]?.address ?? "").toLowerCase();
  const subject = (p.subject ?? "").toLowerCase();
  const ct = header(p, "content-type").toLowerCase();
  if (ct.includes("feedback-report")) return "complaint";
  if (/^(mailer-daemon|postmaster)@/.test(from) || ct.includes("delivery-status") ||
      /delivery status notification \(failure\)|undeliverable|delivery has failed|returned mail|mail delivery failed|failure notice|address not found/.test(subject))
    return "bounce";
  const autoSub = header(p, "auto-submitted").toLowerCase();
  if ((autoSub && autoSub !== "no") || header(p, "x-autoreply") || header(p, "x-autorespond") ||
      /auto_reply|auto-reply/.test(header(p, "precedence").toLowerCase()) ||
      /out of (the )?office|automatic reply|auto(matic)?[- ]?reply|autoreply|abwesenheit|absence|réponse automatique|respuesta automática|fuori sede/.test(subject))
    return "auto";
  if (/^\s*(unsubscribe|remove me|stop)\s*$/i.test(p.subject ?? "") || /^\s*(unsubscribe|remove me|stop)\b/i.test(p.text ?? "")) return "unsubscribe";
  return "reply";
}

/** Exposed for tests and manual re-processing. */
export async function handleRaw(source: Buffer | string) {
  await handle(await simpleParser(source));
}

async function handle(p: ParsedMail) {
  const kind = classify(p);
  const raw = `${p.text ?? ""}\n${typeof p.html === "string" ? p.html : ""}\n${(p.attachments ?? []).map((a) => a.content?.toString("utf8") ?? "").join("\n")}`;
  if (kind === "bounce" || kind === "complaint") {
    const token = raw.match(/X-Avrix-Token:\s*([A-Za-z0-9_-]{10,})/i)?.[1];
    const ourId = raw.match(/<([A-Za-z0-9_-]{10,})\.[a-z0-9]+@[^>\s]+>/i)?.[1];
    const msg = token || ourId
      ? await db.query.emailMessages.findFirst({ where: eq(t.emailMessages.token, (token ?? ourId)!) })
      : null;
    const failed = header(p, "x-failed-recipients") || raw.match(/Final-Recipient:\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i)?.[1] || msg?.toEmail;
    if (!failed) return;
    const email = failed.replace(/[<>"]/g, "").trim().toLowerCase();
    if (kind === "complaint") {
      await db.insert(t.suppressions).values({ email, reason: "COMPLAINT", note: "Feedback loop report" }).onConflictDoNothing();
      await db.update(t.campaignRecipients).set({ status: "COMPLAINED" }).where(eq(t.campaignRecipients.email, email));
      await db.insert(t.emailEvents).values({ type: "COMPLAINT", messageId: msg?.id ?? null, recipientId: msg?.recipientId ?? null });
      log.warn(`complaint from ${email}`);
      return;
    }
    // Soft bounces (mailbox full, 4.x.x) are logged but not suppressed.
    const status = raw.match(/Status:\s*([245]\.\d+\.\d+)/i)?.[1];
    if (status?.startsWith("4")) { log.info(`soft bounce for ${email} (${status})`); return; }
    await markBounced(email, msg?.id ?? null, msg?.recipientId ?? null, `Bounce ${status ?? ""}: ${(p.subject ?? "").slice(0, 120)}`);
    if (msg?.campaignId) await checkBounceRate(msg.campaignId);
    log.info(`bounce recorded for ${email}`);
    return;
  }

  const fromAddr = (p.from?.value?.[0]?.address ?? "").toLowerCase();
  const fromName = p.from?.value?.[0]?.name ?? "";
  if (!fromAddr || fromAddr === env.mail.fromAddress.toLowerCase()) return;

  // Match to one of our sent messages via In-Reply-To / References.
  const refs = [header(p, "in-reply-to"), ...(Array.isArray(p.references) ? p.references : p.references ? [p.references] : [])]
    .join(" ").match(/<[^>]+>/g) ?? [];
  const sent = refs.length
    ? await db.query.emailMessages.findFirst({ where: inArray(t.emailMessages.messageId, refs), with: { recipient: true, campaign: true } })
    : null;

  if (kind === "unsubscribe") {
    await unsubscribeEmail(fromAddr, { messageId: sent?.id, recipientId: sent?.recipientId, how: "reply" });
    log.info(`unsubscribe by reply: ${fromAddr}`);
    return;
  }
  if (kind === "auto" || !sent) return; // ignore auto-replies and unrelated mail

  const snippet = stripQuoted(p.text ?? "").slice(0, 1500);
  const now = new Date();
  await db.insert(t.emailEvents).values({ type: "REPLY", messageId: sent.id, recipientId: sent.recipientId });

  if (sent.recipientId) {
    await db.update(t.campaignRecipients).set({ status: "REPLIED", repliedAt: now, replySnippet: snippet })
      .where(eq(t.campaignRecipients.id, sent.recipientId));
    // Stop follow-ups for this person.
    await db.update(t.emailMessages).set({ status: "CANCELLED", lastError: "Recipient replied" })
      .where(and(eq(t.emailMessages.recipientId, sent.recipientId), eq(t.emailMessages.status, "QUEUED")));
  }
  await db.update(t.contacts).set({ lastEngagedAt: now }).where(eq(t.contacts.email, fromAddr));

  const contact = await db.query.contacts.findFirst({ where: eq(t.contacts.email, fromAddr) });
  const { lead, created } = sent.leadId
    ? { lead: (await db.query.leads.findFirst({ where: eq(t.leads.id, sent.leadId) }))!, created: false }
    : await ensureLead({
        applicationId: sent.campaign?.applicationId ?? sent.applicationId ?? null,
        email: fromAddr, name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || fromName || fromAddr,
        businessName: contact?.businessName, contactId: contact?.id ?? null, source: "CAMPAIGN_REPLY", stage: "Replied",
        phone: contact?.phone, country: contact?.country,
      });
  if (lead) {
    await addActivity(lead.id, "email_reply", `Replied to “${sent.subject}”`, { text: snippet, campaignId: sent.campaignId });
    if (!created) await moveLeadToStageIfEarlier(lead.id, "Replied");
    await alertAdmin(`New reply from ${fromName || fromAddr}`,
      `<p><b>${esc(fromName || fromAddr)}</b> replied${sent.campaign ? ` to campaign “${esc(sent.campaign.name)}”` : ""}:</p><blockquote style="border-left:3px solid #ddd;padding-left:10px;color:#374151">${esc(snippet).replace(/\n/g, "<br>")}</blockquote><p><a href="${env.appUrl}/admin/leads/${lead.id}">Open lead in CRM</a></p>`);
  }
  log.info(`reply recorded from ${fromAddr}`);
}

export function stripQuoted(text: string) {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const l of lines) {
    if (/^On .+wrote:\s*$/i.test(l) || /^-{2,}\s*Original Message/i.test(l) || /^From:\s/i.test(l) || /^Am .+ schrieb/i.test(l) || /^Le .+ a écrit/i.test(l)) break;
    if (l.startsWith(">")) continue;
    out.push(l);
  }
  return out.join("\n").trim();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// OAuth2 access token for IMAP via the same service account used for SMTP.
async function googleAccessToken(): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("jose");
  const key = await importPKCS8(env.smtp.serviceAccountKey, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://mail.google.com/" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.smtp.serviceAccountEmail).setSubject(env.imap.user).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(`Google OAuth failed: ${json.error_description ?? res.status}`);
  return json.access_token;
}
