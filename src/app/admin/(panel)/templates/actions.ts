"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { appScope } from "@/lib/apps";
import { str } from "@/lib/utils";

export async function saveTemplate(fd: FormData) {
  const user = await requireUser();
  const id = str(fd.get("id"));
  const v = { name: str(fd.get("name")) || "Untitled template", subject: str(fd.get("subject")), html: String(fd.get("html") ?? "") };
  if (id) await db.update(t.templates).set(v).where(eq(t.templates.id, id));
  else { const scope = await appScope(user); const [x] = await db.insert(t.templates).values({ ...v, applicationId: scope.selected?.id ?? null }).returning(); redirect(`/admin/templates/${x.id}?ok=Saved`); }
  redirect(`/admin/templates/${id}?ok=Saved`);
}

export async function deleteTemplate(fd: FormData) {
  await requireUser();
  await db.delete(t.templates).where(eq(t.templates.id, str(fd.get("id"))));
  redirect("/admin/templates");
}
