// Typed access to environment configuration (server only).
const num = (v: string | undefined, d: number) => (v === undefined || v === "" ? d : Number(v));
const bool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : v === "true" || v === "1");

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  authSecret: process.env.AUTH_SECRET ?? "",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  ipHashSalt: process.env.IP_HASH_SALT ?? "avrix",
  adminAlertEmail: process.env.ADMIN_ALERT_EMAIL ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: num(process.env.SMTP_PORT, 465),
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    authMode: (process.env.GOOGLE_AUTH_MODE ?? "app_password") as "app_password" | "oauth2",
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    serviceAccountKey: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n"),
  },
  mail: {
    fromName: process.env.MAIL_FROM_NAME ?? "Avrix UK & Europe",
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? process.env.SMTP_USER ?? "",
    replyTo: process.env.MAIL_REPLY_TO ?? process.env.MAIL_FROM_ADDRESS ?? "",
  },
  imap: {
    enabled: bool(process.env.IMAP_ENABLED, true),
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: num(process.env.IMAP_PORT, 993),
    secure: bool(process.env.IMAP_SECURE, true),
    user: process.env.IMAP_USER ?? process.env.SMTP_USER ?? "",
    pass: process.env.IMAP_PASS ?? process.env.SMTP_PASS ?? "",
    pollMinutes: num(process.env.IMAP_POLL_MINUTES, 5),
  },
  send: {
    dailyCap: num(process.env.SEND_DAILY_CAP, 1000),
    hourlyCap: num(process.env.SEND_HOURLY_CAP, 150),
    minGap: num(process.env.SEND_MIN_GAP_SECONDS, 30),
    maxGap: num(process.env.SEND_MAX_GAP_SECONDS, 120),
    warmupEnabled: bool(process.env.WARMUP_ENABLED, true),
    warmupSchedule: (process.env.WARMUP_SCHEDULE ?? "20,40,80,150,300,500,800")
      .split(",").map((s) => Number(s.trim())).filter((n) => n > 0),
    bouncePauseThreshold: num(process.env.BOUNCE_PAUSE_THRESHOLD, 0.03),
    bouncePauseMinSent: num(process.env.BOUNCE_PAUSE_MIN_SENT, 50),
  },
  company: {
    legalName: process.env.COMPANY_LEGAL_NAME ?? "Avrix UK & Europe Business Marketing",
    address: process.env.COMPANY_POSTAL_ADDRESS ?? "",
    phone: process.env.COMPANY_PHONE ?? "",
    whatsapp: process.env.COMPANY_WHATSAPP ?? "",
  },
};
