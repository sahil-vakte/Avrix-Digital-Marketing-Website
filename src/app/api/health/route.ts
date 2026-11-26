import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRaw } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const hb = await getRaw<{ at: string }>("worker.heartbeat");
    const workerAgeSec = hb ? Math.round((Date.now() - new Date(hb.at).getTime()) / 1000) : null;
    const workerPaused = process.env.CRM_WORKER_PAUSED === "true";
    const ok = workerPaused || (workerAgeSec !== null && workerAgeSec < 120);
    return Response.json({ ok, db: "up", worker: workerPaused ? "paused" : ok ? "up" : "stale", workerAgeSec }, { status: ok ? 200 : 503 });
  } catch (e) {
    return Response.json({ ok: false, db: "down", error: (e as Error).message }, { status: 503 });
  }
}
