import { db, t } from "@/db";

export async function audit(
  userId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: unknown,
  ip?: string | null,
) {
  try {
    await db.insert(t.auditLogs).values({
      userId: userId ?? null, action, entity, entityId: entityId ?? null, diff: (diff ?? null) as object | null, ip: ip ?? null,
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
