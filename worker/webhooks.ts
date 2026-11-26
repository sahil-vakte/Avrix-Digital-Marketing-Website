// Delivers signed "lead.stage_changed" events to source applications, with retries and back-off.
import { and, asc, eq, isNull, lte, lt } from "drizzle-orm";
import { db, t } from "../src/db";
import { decrypt } from "../src/lib/crypto";
import { signatureHeaders } from "../src/lib/signing";
import { log } from "./log";

const MAX_ATTEMPTS = 8;
const backoffMinutes = (attempt: number) => Math.min(24 * 60, 2 ** attempt); // 2, 4, 8 … minutes, capped at a day

export async function deliverWebhooks(limit = 20) {
  const due = await db.select({ d: t.webhookDeliveries, app: t.applications }).from(t.webhookDeliveries)
    .innerJoin(t.applications, eq(t.applications.id, t.webhookDeliveries.applicationId))
    .where(and(isNull(t.webhookDeliveries.deliveredAt), lte(t.webhookDeliveries.nextAttemptAt, new Date()), lt(t.webhookDeliveries.attempts, MAX_ATTEMPTS)))
    .orderBy(asc(t.webhookDeliveries.createdAt)).limit(limit);
  for (const { d, app } of due) {
    const attempts = d.attempts + 1;
    if (!app.webhookUrl || !app.webhookSecretEnc) {
      await db.update(t.webhookDeliveries).set({ attempts, lastError: "Webhook URL or secret not set", nextAttemptAt: new Date(Date.now() + 60 * 60_000) }).where(eq(t.webhookDeliveries.id, d.id));
      continue;
    }
    const body = JSON.stringify(d.body);
    try {
      const res = await fetch(app.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-avrix-event": d.event, "x-avrix-delivery": d.id, ...signatureHeaders(decrypt(app.webhookSecretEnc), body) },
        body, signal: AbortSignal.timeout(10_000), redirect: "error",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db.update(t.webhookDeliveries).set({ attempts, deliveredAt: new Date(), lastError: null }).where(eq(t.webhookDeliveries.id, d.id));
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300);
      await db.update(t.webhookDeliveries).set({ attempts, lastError: msg, nextAttemptAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000) }).where(eq(t.webhookDeliveries.id, d.id));
      log.error(`webhook to ${app.key} failed (attempt ${attempts}): ${msg}`);
    }
  }
}
