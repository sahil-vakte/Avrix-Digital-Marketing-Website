// Shared-secret signing for the intake API and outbound webhooks.
// Signature = hex HMAC-SHA256 of `${timestamp}.${rawBody}`, sent as `X-Avrix-Signature: sha256=<hex>`.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-avrix-signature";
export const TIMESTAMP_HEADER = "x-avrix-timestamp";
export const MAX_SKEW_SECONDS = 300;

export function sign(secret: string, timestamp: string | number, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function signatureHeaders(secret: string, rawBody: string, now = Date.now()) {
  const ts = Math.floor(now / 1000).toString();
  return { [TIMESTAMP_HEADER]: ts, [SIGNATURE_HEADER]: `sha256=${sign(secret, ts, rawBody)}` };
}

export function verifySignature(secret: string, timestamp: string | null, header: string | null, rawBody: string, now = Date.now()):
  { ok: true } | { ok: false; reason: string } {
  if (!timestamp || !header) return { ok: false, reason: "Missing signature headers" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > MAX_SKEW_SECONDS) return { ok: false, reason: "Timestamp outside the 5-minute window" };
  const given = header.replace(/^sha256=/, "");
  const expected = sign(secret, timestamp, rawBody);
  if (given.length !== expected.length) return { ok: false, reason: "Bad signature" };
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex")) ? { ok: true } : { ok: false, reason: "Bad signature" };
}

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function newApiCredentials() {
  const key = `avx_${randomBytes(24).toString("base64url")}`;
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  return { key, secret, prefix: key.slice(0, 10), keyHash: hashKey(key) };
}
