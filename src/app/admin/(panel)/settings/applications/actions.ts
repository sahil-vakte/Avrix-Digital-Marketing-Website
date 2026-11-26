"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { newApiCredentials } from "@/lib/signing";
import { createStagesFromPreset, REVEAL_COOKIE, STAGE_PRESETS } from "@/lib/apps";
import { slugify, str, strOrNull } from "@/lib/utils";

const page = (id?: string, q = "") => `/admin/settings/applications${id ? `?id=${encodeURIComponent(id)}${q ? `&${q}` : ""}` : q ? `?${q}` : ""}`;

/** Credentials are shown once: kept encrypted in a 3-minute cookie scoped to this page, never in the URL. */
async function reveal(payload: Record<string, string>) {
  (await cookies()).set(REVEAL_COOKIE, encrypt(JSON.stringify(payload)), { httpOnly: true, sameSite: "strict", path: "/admin/settings/applications", maxAge: 180 });
}

export async function dismissReveal(fd: FormData) {
  await requireUser({ admin: true });
  (await cookies()).delete({ name: REVEAL_COOKIE, path: "/admin/settings/applications" });
  redirect(page(str(fd.get("id"))));
}

const DATA_CLASSES = ["BUSINESS", "HEALTH", "RECRUITMENT"] as const;
type DataClass = (typeof DATA_CLASSES)[number];

export async function createApplication(fd: FormData) {
  const user = await requireUser({ admin: true });
  const name = str(fd.get("name"));
  const key = slugify(str(fd.get("key")) || name);
  if (!name || !key) redirect(page(undefined, "error=Name+is+required"));
  const dataClass = (DATA_CLASSES as readonly string[]).includes(str(fd.get("dataClass"))) ? (str(fd.get("dataClass")) as DataClass) : "BUSINESS";
  const exists = await db.query.applications.findFirst({ where: eq(t.applications.key, key) });
  if (exists) redirect(page(exists.id, "error=An+application+with+that+key+already+exists"));
  const [app] = await db.insert(t.applications).values({
    key, name, domain: strOrNull(fd.get("domain")), color: str(fd.get("color")) || "#3563f2", dataClass,
    campaignsAllowed: dataClass === "BUSINESS", sortOrder: 50,
  }).returning();
  const preset = str(fd.get("preset"));
  await createStagesFromPreset(app.id, (preset in STAGE_PRESETS ? preset : dataClass === "HEALTH" ? "clinic" : "sales") as keyof typeof STAGE_PRESETS);
  await audit(user.id, "create", "application", app.id, { key, dataClass });
  redirect(page(app.id, "ok=Application+created.+Generate+an+API+key+to+connect+it."));
}

export async function saveApplication(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const app = await db.query.applications.findFirst({ where: eq(t.applications.id, id) });
  if (!app) redirect(page());
  const dataClass = (DATA_CLASSES as readonly string[]).includes(str(fd.get("dataClass"))) ? (str(fd.get("dataClass")) as DataClass) : app.dataClass;
  const smtpPass = str(fd.get("smtpPass"));
  const port = Number(fd.get("smtpPort") || 0);
  const v = {
    name: str(fd.get("name")) || app.name, domain: strOrNull(fd.get("domain")), color: str(fd.get("color")) || app.color, dataClass,
    active: fd.get("active") === "on",
    // Health applications can never be used for campaigns.
    campaignsAllowed: dataClass === "HEALTH" ? false : fd.get("campaignsAllowed") === "on",
    sortOrder: Number(fd.get("sortOrder") || app.sortOrder),
    alertEmail: strOrNull(fd.get("alertEmail")), fromName: strOrNull(fd.get("fromName")), fromAddress: strOrNull(fd.get("fromAddress"))?.toLowerCase() ?? null,
    replyTo: strOrNull(fd.get("replyTo")), legalName: strOrNull(fd.get("legalName")), postalAddress: strOrNull(fd.get("postalAddress")),
    smtpHost: strOrNull(fd.get("smtpHost")), smtpPort: port > 0 ? port : null, smtpSecure: fd.get("smtpSecure") === "on", smtpUser: strOrNull(fd.get("smtpUser")),
    ...(smtpPass ? { smtpPassEnc: encrypt(smtpPass) } : {}), ...(fd.get("clearSmtpPass") === "on" ? { smtpPassEnc: null } : {}),
    recordUrlTemplate: strOrNull(fd.get("recordUrlTemplate")), webhookUrl: strOrNull(fd.get("webhookUrl")),
    retentionMonths: Number(fd.get("retentionMonths") || 0) || null, notes: strOrNull(fd.get("notes")),
  };
  if (v.webhookUrl && !/^https:\/\//.test(v.webhookUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(v.webhookUrl)) redirect(page(id, "error=Webhook+URL+must+use+https"));
  await db.update(t.applications).set(v).where(eq(t.applications.id, id));
  await audit(user.id, "update", "application", id, { ...v, smtpPassEnc: undefined });
  revalidatePath("/admin", "layout");
  redirect(page(id, "ok=Saved"));
}

export async function createKey(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const app = await db.query.applications.findFirst({ where: eq(t.applications.id, id) });
  if (!app) redirect(page());
  const c = newApiCredentials();
  await db.insert(t.applicationKeys).values({ applicationId: id, label: str(fd.get("label")) || "Production", prefix: c.prefix, keyHash: c.keyHash, secretEnc: encrypt(c.secret) });
  await audit(user.id, "create_key", "application", id, { prefix: c.prefix });
  await reveal({ kind: "key", appId: id, key: c.key, secret: c.secret });
  redirect(page(id) + "#keys");
}

export async function revokeKey(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const keyId = str(fd.get("keyId"));
  await db.update(t.applicationKeys).set({ revokedAt: new Date() }).where(and(eq(t.applicationKeys.id, keyId), eq(t.applicationKeys.applicationId, id)));
  await audit(user.id, "revoke_key", "application", id, { keyId });
  redirect(page(id, "ok=Key+revoked") + "#keys");
}

export async function rotateWebhookSecret(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  await db.update(t.applications).set({ webhookSecretEnc: encrypt(secret) }).where(eq(t.applications.id, id));
  await audit(user.id, "rotate_webhook_secret", "application", id);
  await reveal({ kind: "webhook", appId: id, secret });
  redirect(page(id) + "#webhook");
}

export async function retryWebhooks(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  await db.update(t.webhookDeliveries).set({ attempts: 0, nextAttemptAt: new Date(), lastError: null })
    .where(and(eq(t.webhookDeliveries.applicationId, id), isNull(t.webhookDeliveries.deliveredAt)));
  await audit(user.id, "retry_webhooks", "application", id);
  redirect(page(id, "ok=Undelivered+updates+will+be+retried+within+a+minute") + "#webhook");
}
