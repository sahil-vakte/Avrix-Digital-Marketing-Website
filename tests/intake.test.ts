import { describe, expect, it } from "vitest";
import { hashKey, newApiCredentials, sign, signatureHeaders, verifySignature } from "../src/lib/signing";
import { STAGE_PRESETS } from "../src/lib/stage-presets";

describe("intake signing", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ email: "jane@example.com" });

  it("accepts a fresh, correctly signed body", () => {
    const h = signatureHeaders(secret, body);
    expect(verifySignature(secret, h["x-avrix-timestamp"], h["x-avrix-signature"], body)).toEqual({ ok: true });
  });

  it("rejects a tampered body, a wrong secret and missing headers", () => {
    const h = signatureHeaders(secret, body);
    expect(verifySignature(secret, h["x-avrix-timestamp"], h["x-avrix-signature"], body + " ").ok).toBe(false);
    expect(verifySignature("other", h["x-avrix-timestamp"], h["x-avrix-signature"], body).ok).toBe(false);
    expect(verifySignature(secret, null, null, body).ok).toBe(false);
  });

  it("rejects replays outside the 5-minute window", () => {
    const old = Date.now() - 10 * 60_000;
    const ts = Math.floor(old / 1000).toString();
    expect(verifySignature(secret, ts, `sha256=${sign(secret, ts, body)}`, body)).toEqual({ ok: false, reason: "Timestamp outside the 5-minute window" });
  });

  it("stores only a hash of API keys", () => {
    const c = newApiCredentials();
    expect(c.key.startsWith("avx_")).toBe(true);
    expect(c.keyHash).toBe(hashKey(c.key));
    expect(c.keyHash).not.toContain(c.key);
    expect(c.prefix).toBe(c.key.slice(0, 10));
  });
});

describe("pipeline presets", () => {
  it("each preset has exactly one won stage and at least one lost stage", () => {
    for (const [name, stages] of Object.entries(STAGE_PRESETS)) {
      expect(stages.filter((s) => s.isWon).length, name).toBe(1);
      expect(stages.some((s) => s.isLost), name).toBe(true);
    }
  });
});
