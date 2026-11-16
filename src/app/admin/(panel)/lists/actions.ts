"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, t } from "@/db";
import type { SegmentRules } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str } from "@/lib/utils";

function rules(fd: FormData): SegmentRules {
  const arr = (k: string) => fd.getAll(k).map(String).filter(Boolean);
  return {
    countries: arr("countries"), businessTypes: arr("businessTypes"), consentStatuses: arr("consentStatuses"),
    tags: str(fd.get("tags")).split(",").map((s) => s.trim()).filter(Boolean),
    notEmailedDays: Number(fd.get("notEmailedDays") || 0) || undefined, search: str(fd.get("search")) || undefined,
  };
}

export async function createList(fd: FormData) {
  const user = await requireUser();
  const type = fd.get("type") === "SEGMENT" ? "SEGMENT" : "STATIC";
  const [l] = await db.insert(t.lists).values({ name: str(fd.get("name")) || "Untitled list", description: str(fd.get("description")) || null, type, segmentRules: type === "SEGMENT" ? rules(fd) : null }).returning();
  await audit(user.id, "create", "list", l.id);
  redirect(`/admin/lists/${l.id}`);
}

export async function updateList(fd: FormData) {
  await requireUser();
  const id = str(fd.get("id"));
  const l = await db.query.lists.findFirst({ where: eq(t.lists.id, id) });
  if (!l) return;
  await db.update(t.lists).set({ name: str(fd.get("name")), description: str(fd.get("description")) || null, segmentRules: l.type === "SEGMENT" ? rules(fd) : null }).where(eq(t.lists.id, id));
  revalidatePath(`/admin/lists/${id}`);
}

export async function deleteList(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  await db.delete(t.lists).where(eq(t.lists.id, id));
  await audit(user.id, "delete", "list", id);
  redirect("/admin/lists");
}

export async function removeMembers(fd: FormData) {
  await requireUser();
  const listId = str(fd.get("listId"));
  const ids = fd.getAll("ids").map(String);
  if (ids.length) await db.delete(t.listMembers).where(and(eq(t.listMembers.listId, listId), inArray(t.listMembers.contactId, ids)));
  revalidatePath(`/admin/lists/${listId}`);
}
