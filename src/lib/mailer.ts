// SMTP transport (Google Workspace by default) — the only way mail leaves the system.
import nodemailer, { type Transporter } from "nodemailer";
import { eq } from "drizzle-orm";
import { env } from "./env";
import { db, t } from "../db";
import { decrypt } from "./crypto";

let transporter: Transporter | null = null;

export function getTransport(): Transporter {
  if (transporter) return transporter;
  const s = env.smtp;
  const auth =
    s.authMode === "oauth2"
      ? { type: "OAuth2" as const, user: s.user, serviceClient: s.serviceAccountEmail, privateKey: s.serviceAccountKey }
      : { user: s.user, pass: s.pass };
  transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth,
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
    tls: { minVersion: "TLSv1.2" },
  } as nodemailer.TransportOptions);
  return transporter;
}

export type OutgoingMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  replyTo?: string | null;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  headers?: Record<string, string>;
};

/** Sending identity for an application: its own mailbox if configured, else the default transport with its From address. */
export type Sender = { transport?: Transporter; fromName?: string | null; fromAddress?: string | null; replyTo?: string | null };

const appTransports = new Map<string, { at: number; sender: Sender }>();

export async function senderFor(applicationId: string | null | undefined): Promise<Sender> {
  if (!applicationId) return {};
  const hit = appTransports.get(applicationId);
  if (hit && Date.now() - hit.at < 60_000) return hit.sender;
  const app = await db.query.applications.findFirst({ where: eq(t.applications.id, applicationId) });
  let sender: Sender = {};
  if (app) {
    sender = { fromName: app.fromName, fromAddress: app.fromAddress, replyTo: app.replyTo };
    if (app.smtpHost && app.smtpUser && app.smtpPassEnc) {
      sender.transport = nodemailer.createTransport({
        host: app.smtpHost, port: app.smtpPort ?? (app.smtpSecure ? 465 : 587), secure: app.smtpSecure,
        auth: { user: app.smtpUser, pass: decrypt(app.smtpPassEnc) }, pool: true, maxConnections: 1, maxMessages: 50,
        connectionTimeout: 20_000, greetingTimeout: 15_000, socketTimeout: 60_000, tls: { minVersion: "TLSv1.2" },
      } as nodemailer.TransportOptions);
      sender.fromAddress ||= app.smtpUser;
    }
  }
  appTransports.set(applicationId, { at: Date.now(), sender });
  return sender;
}

/** Company name and postal address for an application's email footer. */
export async function footerFor(applicationId: string | null | undefined) {
  const app = applicationId ? await db.query.applications.findFirst({ where: eq(t.applications.id, applicationId) }) : null;
  return { legalName: app?.legalName || env.company.legalName, address: app?.postalAddress || env.company.address, replyTo: app?.replyTo || env.mail.replyTo };
}

export async function sendMail(m: OutgoingMail, sender: Sender = {}) {
  const info = await (sender.transport ?? getTransport()).sendMail({
    from: { name: m.fromName || sender.fromName || env.mail.fromName, address: sender.fromAddress || env.mail.fromAddress },
    to: m.to,
    replyTo: m.replyTo || sender.replyTo || env.mail.replyTo || undefined,
    subject: m.subject,
    html: m.html,
    text: m.text,
    messageId: m.messageId,
    inReplyTo: m.inReplyTo || undefined,
    references: m.references || m.inReplyTo || undefined,
    headers: m.headers,
  });
  return info;
}

export function newMessageId(token: string, fromAddress?: string | null) {
  const domain = ((fromAddress || env.mail.fromAddress).split("@")[1] || "avrix.local").toLowerCase();
  return `<${token}.${Date.now().toString(36)}@${domain}>`;
}

/** Classify an SMTP error: permanent (5xx), Google sending limit, or temporary. */
export function classifySmtpError(err: unknown): { kind: "permanent" | "limit" | "temporary" | "auth"; message: string } {
  const e = err as { responseCode?: number; response?: string; message?: string; code?: string };
  const body = e.response ?? e.message ?? String(err);
  const msg = e.responseCode && !body.startsWith(String(e.responseCode)) ? `${e.responseCode} ${body}` : body;
  const lower = msg.toLowerCase();
  if (e.code === "EAUTH" || e.responseCode === 535 || e.responseCode === 534) return { kind: "auth", message: msg };
  if (/5\.4\.5|daily (user )?sending (quota|limit)|sending limit exceeded|rate limit|too many messages|4\.7\.28|5\.7\.28/.test(lower))
    return { kind: "limit", message: msg };
  if (e.responseCode && e.responseCode >= 500 && e.responseCode < 600) return { kind: "permanent", message: msg };
  return { kind: "temporary", message: msg };
}
