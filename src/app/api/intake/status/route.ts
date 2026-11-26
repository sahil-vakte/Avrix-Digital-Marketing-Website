// POST /api/intake/status — the source application reports a status change for a lead it sent earlier.
// Body: { externalId, stage?, priority?, note? }. Same authentication as /api/intake/leads.
import type { NextRequest } from "next/server";
import { IntakeError, IntakeStatus, processStatus } from "@/lib/intake";
import { authenticate, json } from "@/lib/intake-http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof Response) return a;
  const parsed = IntakeStatus.safeParse(a.body);
  if (!parsed.success) return json({ error: "Invalid status update", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 422);
  try {
    return json({ ok: true, ...(await processStatus(a.app, parsed.data)) });
  } catch (e) {
    if (e instanceof IntakeError) return json({ error: e.message }, e.status);
    console.error("[intake/status] failed", (e as Error).message);
    return json({ error: "Could not update the lead" }, 500);
  }
}
