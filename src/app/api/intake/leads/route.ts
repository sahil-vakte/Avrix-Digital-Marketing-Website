// POST /api/intake/leads — another application sends a new or updated lead.
// Auth: `Authorization: Bearer <key>` + `X-Avrix-Timestamp` + `X-Avrix-Signature: sha256=<hmac>`.
// Idempotency: `Idempotency-Key` header, else the body's externalId.
import type { NextRequest } from "next/server";
import { IntakeError, IntakeLead, processIntake } from "@/lib/intake";
import { authenticate, json } from "@/lib/intake-http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof Response) return a;
  const parsed = IntakeLead.safeParse(a.body);
  if (!parsed.success) return json({ error: "Invalid lead", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 422);
  const idem = req.headers.get("idempotency-key")?.slice(0, 200) || null;
  try {
    const r = await processIntake(a.app, parsed.data, idem);
    return json({ ok: true, application: a.app.key, ...r }, r.outcome === "created" ? 201 : 200);
  } catch (e) {
    if (e instanceof IntakeError) return json({ error: e.message }, e.status);
    console.error("[intake] failed", (e as Error).message);
    return json({ error: "Could not store the lead" }, 500);
  }
}

export function GET() {
  return json({ ok: true, endpoint: "POST /api/intake/leads", docs: "See docs/INTAKE-API.md" });
}
