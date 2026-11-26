// Shared request handling for the intake endpoints: API key, signature, rate limit, JSON body.
import type { NextRequest } from "next/server";
import { decrypt } from "./crypto";
import { rateLimit } from "./rate-limit";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./signing";
import { applicationForKey } from "./intake";

export type Authed = Exclude<Awaited<ReturnType<typeof applicationForKey>>, null> & { body: unknown };

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function authenticate(req: NextRequest): Promise<Authed | Response> {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : req.headers.get("x-avrix-key")?.trim();
  if (!key) return json({ error: "Missing API key (Authorization: Bearer <key>)" }, 401);
  if (!rateLimit(`intake:${key.slice(0, 12)}`, 240, 60_000)) return json({ error: "Rate limit exceeded" }, 429);
  const found = await applicationForKey(key);
  if (!found) return json({ error: "Unknown, revoked or inactive API key" }, 401);
  const raw = await req.text();
  if (raw.length > 512_000) return json({ error: "Body too large" }, 413);
  const v = verifySignature(decrypt(found.key.secretEnc), req.headers.get(TIMESTAMP_HEADER), req.headers.get(SIGNATURE_HEADER), raw);
  if (!v.ok) return json({ error: v.reason }, 401);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "Body must be JSON" }, 400); }
  return { ...found, body };
}
