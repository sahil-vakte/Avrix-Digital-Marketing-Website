"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ALL, APP_COOKIE, allowedApplications } from "@/lib/apps";

/** Application switcher: remembers the chosen application (or "all") for this browser. */
export async function selectApplication(fd: FormData) {
  const user = await requireUser();
  const wanted = String(fd.get("app") ?? ALL);
  const apps = await allowedApplications(user);
  const value = wanted !== ALL && apps.some((a) => a.id === wanted) ? wanted : ALL;
  (await cookies()).set(APP_COOKIE, value, { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 60 * 60 * 24 * 180 });
  const back = String(fd.get("back") ?? "/admin");
  // Stay on the same section but drop filters that belonged to the previous application.
  const path = back.startsWith("/admin") ? back.split("?")[0].replace(/\/(leads|contacts|campaigns|lists|templates)\/[^/]+.*$/, "/$1") : "/admin";
  redirect(path);
}
