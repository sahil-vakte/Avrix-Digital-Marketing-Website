import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("Unauthorised", { status: 401 });
  const job = await db.query.importJobs.findFirst({ where: eq(t.importJobs.id, (await params).id) });
  if (!job) return new Response("Not found", { status: 404 });
  const csv = toCsv([["Row", "Email", "Reason"], ...(job.errors ?? []).map((e) => [e.row, e.email, e.reason])]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="import-issues-${job.id}.csv"` } });
}
