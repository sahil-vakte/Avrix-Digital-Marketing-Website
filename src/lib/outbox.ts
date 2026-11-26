// Queue non-campaign mail (one-to-one, alerts, booking confirmations). The worker
// sends it through the same SMTP account so it counts against the same caps.
import { db, t } from "@/db";
import { env } from "./env";
import { randomToken } from "./crypto";

export async function queueEmail(o: {
  to: string; subject: string; html: string; kind?: "ONE_TO_ONE" | "SYSTEM" | "TEST"; leadId?: string | null; applicationId?: string | null;
}) {
  const [m] = await db.insert(t.emailMessages).values({
    kind: o.kind ?? "SYSTEM", toEmail: o.to.toLowerCase(), subject: o.subject, html: o.html,
    leadId: o.leadId ?? null, applicationId: o.applicationId ?? null, token: randomToken(), scheduledFor: new Date(),
  }).returning();
  return m;
}

export async function alertAdmin(subject: string, html: string) {
  if (!env.adminAlertEmail) return;
  await queueEmail({ to: env.adminAlertEmail, subject: `[Avrix] ${subject}`, html });
}
