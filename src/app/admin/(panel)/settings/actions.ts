"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";
import { getTransport } from "@/lib/mailer";
import { env } from "@/lib/env";
import { str } from "@/lib/utils";

export async function saveCompliance(fd: FormData) {
  const user = await requireUser({ admin: true });
  const v = { unknownTypeRequiresConsent: fd.get("unknownTypeRequiresConsent") === "on", requireApprovalForStaff: fd.get("requireApprovalForStaff") === "on", retentionMonths: Number(fd.get("retentionMonths") || 24) };
  await setSetting("compliance", v);
  await audit(user.id, "update", "settings.compliance", null, v);
  redirect("/admin/settings?ok=Compliance+settings+saved");
}

export async function togglePause(fd: FormData) {
  const user = await requireUser({ admin: true });
  if (fd.get("op") === "pause") await setSetting("sending.pause", { until: Date.now() + Number(fd.get("hours") || 24) * 3_600_000, reason: `Paused manually by ${user.name}` });
  else await setSetting("sending.pause", { until: 0, reason: "" });
  await audit(user.id, `sending_${fd.get("op")}`, "settings", null);
  redirect("/admin/settings");
}

export async function testSmtp() {
  await requireUser({ admin: true });
  let error: string | null = null;
  try {
    await getTransport().verify();
  } catch (e) {
    error = (e as Error).message;
  }
  redirect(error ? `/admin/settings?error=${encodeURIComponent("SMTP check failed: " + error)}` : "/admin/settings?ok=SMTP+connection+and+login+OK");
}

export async function saveStage(fd: FormData) {
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const v = { name: str(fd.get("name")), order: Number(fd.get("order") || 0), color: str(fd.get("color")) || "#3563f2", isWon: fd.get("isWon") === "on", isLost: fd.get("isLost") === "on" };
  if (fd.get("delete") === "1" && id) {
    const first = await db.query.pipelineStages.findFirst({ where: (s, { ne }) => ne(s.id, id), orderBy: (s, { asc }) => asc(s.order) });
    if (first) await db.update(t.leads).set({ stageId: first.id }).where(eq(t.leads.stageId, id));
    await db.delete(t.pipelineStages).where(eq(t.pipelineStages.id, id));
  } else if (id) await db.update(t.pipelineStages).set(v).where(eq(t.pipelineStages.id, id));
  else if (v.name) await db.insert(t.pipelineStages).values(v);
  await audit(user.id, "update", "pipeline_stage", id || null, v);
  revalidatePath("/admin/settings");
}

export async function saveCountry(fd: FormData) {
  const user = await requireUser({ admin: true });
  const code = str(fd.get("countryCode")).toUpperCase();
  const v = { name: str(fd.get("name")), consentRequired: fd.get("consentRequired") === "on", timezone: str(fd.get("timezone")) || "Europe/London", note: str(fd.get("note")) || null };
  await db.insert(t.countryRules).values({ countryCode: code, ...v }).onConflictDoUpdate({ target: t.countryRules.countryCode, set: v });
  await audit(user.id, "update", "country_rule", code, v);
  revalidatePath("/admin/settings/countries");
}

export async function saveUser(fd: FormData) {
  const admin = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const email = str(fd.get("email")).toLowerCase();
  const role = fd.get("role") === "ADMIN" ? "ADMIN" : "STAFF";
  const pw = String(fd.get("password") ?? "");
  if (id) {
    if (id === admin.id && role !== "ADMIN") redirect("/admin/settings/users?error=You+cannot+remove+your+own+admin+role");
    await db.update(t.users).set({ name: str(fd.get("name")), role, active: fd.get("active") === "on" || id === admin.id, ...(pw ? { passwordHash: await hashPassword(pw) } : {}),
      ...(fd.get("reset2fa") === "on" ? { totpEnabled: false, totpSecret: null } : {}) }).where(eq(t.users.id, id));
  } else {
    if (pw.length < 12) redirect("/admin/settings/users?error=Temporary+password+must+be+at+least+12+characters");
    await db.insert(t.users).values({ email, name: str(fd.get("name")), role, passwordHash: await hashPassword(pw) }).onConflictDoNothing();
  }
  await audit(admin.id, id ? "update" : "create", "user", id || email, { role });
  redirect("/admin/settings/users?ok=Saved");
}
