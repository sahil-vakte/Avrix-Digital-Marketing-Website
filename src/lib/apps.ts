// Applications: which source app a record belongs to, and which apps the signed-in user may see.
import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { asc, eq, inArray, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { db, t } from "@/db";
import type { Application, User } from "@/db/schema";
import { STAGE_PRESETS } from "./stage-presets";
export { STAGE_PRESETS };

export const APP_COOKIE = "avrix_app";
export const ALL = "all";
export const REVEAL_COOKIE = "avrix_reveal";

export type AppScope = {
  /** Applications this user may see, in display order. */
  apps: Application[];
  /** The application chosen in the switcher, or null for "All applications". */
  selected: Application | null;
  ids: string[];
};

export async function listApplications(includeInactive = true) {
  return db.select().from(t.applications)
    .where(includeInactive ? undefined : eq(t.applications.active, true))
    .orderBy(asc(t.applications.sortOrder), asc(t.applications.name));
}

/**
 * Administrators see every application. Staff see the applications they are assigned to;
 * staff with no assignments see business applications only (health and recruitment data always
 * needs an explicit assignment).
 */
export async function allowedApplications(user: Pick<User, "id" | "role">): Promise<Application[]> {
  const all = await listApplications();
  if (user.role === "ADMIN") return all;
  const assigned = await db.select({ id: t.userApplications.applicationId }).from(t.userApplications).where(eq(t.userApplications.userId, user.id));
  if (assigned.length) {
    const set = new Set(assigned.map((a) => a.id));
    return all.filter((a) => set.has(a.id));
  }
  return all.filter((a) => a.dataClass === "BUSINESS");
}

/** Resolve the scope for a page: `?app=` wins, then the switcher cookie, then "all". */
export async function appScope(user: Pick<User, "id" | "role">, requested?: string | null): Promise<AppScope> {
  const apps = await allowedApplications(user);
  const wanted = requested ?? (await cookies()).get(APP_COOKIE)?.value ?? ALL;
  const selected = wanted === ALL ? null : apps.find((a) => a.id === wanted || a.key === wanted) ?? null;
  return { apps, selected, ids: apps.map((a) => a.id) };
}

/** SQL condition limiting `column` to the scope (one app, or every app the user may see). */
export function inScope(column: AnyColumn, scope: AppScope): SQL {
  if (scope.selected) return eq(column, scope.selected.id);
  if (!scope.ids.length) return sql`false`;
  return inArray(column, scope.ids);
}

/** Like inScope, but rows with no application (legacy shared records) stay visible to admins. */
export function inScopeOrShared(column: AnyColumn, scope: AppScope, user: Pick<User, "role">): SQL {
  const cond = inScope(column, scope);
  return user.role === "ADMIN" && !scope.selected ? sql`(${cond} or ${column} is null)` : cond;
}

export async function canSeeApplication(user: Pick<User, "id" | "role">, applicationId: string | null | undefined) {
  if (!applicationId) return user.role === "ADMIN";
  const apps = await allowedApplications(user);
  return apps.some((a) => a.id === applicationId);
}

/** Loads a lead the user is allowed to see, or 404s. Use in every lead page and action. */
export async function leadForUser(user: Pick<User, "id" | "role">, leadId: string) {
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, leadId) });
  if (!lead || !(await canSeeApplication(user, lead.applicationId))) notFound();
  return lead;
}

export async function stagesFor(applicationId: string) {
  return db.select().from(t.pipelineStages).where(eq(t.pipelineStages.applicationId, applicationId)).orderBy(asc(t.pipelineStages.order));
}

export async function stagesForApps(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(t.pipelineStages).where(inArray(t.pipelineStages.applicationId, ids)).orderBy(asc(t.pipelineStages.order));
}

/** The default application for records created inside the CRM when "All applications" is selected. */
export async function defaultApplication(scope?: AppScope): Promise<Application> {
  if (scope?.selected) return scope.selected;
  const first = scope?.apps.find((a) => a.dataClass === "BUSINESS") ?? scope?.apps[0];
  if (first) return first;
  const [app] = await db.select().from(t.applications).orderBy(asc(t.applications.sortOrder)).limit(1);
  if (!app) throw new Error("No applications configured. Run `npm run db:seed`.");
  return app;
}

export function recordUrl(app: Pick<Application, "recordUrlTemplate"> | null | undefined, externalId: string | null | undefined, externalUrl?: string | null) {
  if (externalUrl) return externalUrl;
  if (!app?.recordUrlTemplate || !externalId) return null;
  return app.recordUrlTemplate.replace("{id}", encodeURIComponent(externalId));
}

export const DATA_CLASS_LABEL: Record<Application["dataClass"], string> = {
  BUSINESS: "Business",
  HEALTH: "Health data",
  RECRUITMENT: "Recruitment",
};

export async function createStagesFromPreset(applicationId: string, preset: keyof typeof STAGE_PRESETS) {
  const rows = STAGE_PRESETS[preset].map((s, i) => ({ ...s, order: i + 1, applicationId }));
  await db.insert(t.pipelineStages).values(rows).onConflictDoNothing();
}
