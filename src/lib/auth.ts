import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type SessionPayload } from "./session";

authenticator.options = { window: 1 };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const generateTotpSecret = () => authenticator.generateSecret();
export const verifyTotp = (code: string, secret: string) => authenticator.check(code.replace(/\s/g, ""), secret);
export const totpUri = (email: string, secret: string) => authenticator.keyuri(email, "Avrix UK & Europe", secret);

export async function setSession(p: SessionPayload) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(p), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Loads the current user (fresh from DB) or redirects to login. */
export async function requireUser(opts: { admin?: boolean } = {}) {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  const user = await db.query.users.findFirst({ where: eq(t.users.id, s.uid) });
  if (!user || !user.active) {
    redirect("/admin/login");
  }
  if (opts.admin && user.role !== "ADMIN") redirect("/admin?denied=1");
  return user;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
}
