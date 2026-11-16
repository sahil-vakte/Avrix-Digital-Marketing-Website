// SMTP transport (Google Workspace by default) — the only way mail leaves the system.
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

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

export async function sendMail(m: OutgoingMail) {
  const info = await getTransport().sendMail({
    from: { name: m.fromName || env.mail.fromName, address: env.mail.fromAddress },
    to: m.to,
    replyTo: m.replyTo || env.mail.replyTo || undefined,
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

export function newMessageId(token: string) {
  const domain = (env.mail.fromAddress.split("@")[1] || "avrix.local").toLowerCase();
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
