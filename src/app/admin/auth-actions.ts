"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db, t } from "@/db";
import { checkPassword, clearSession, clientIp, hashPassword, setSession, verifyTotp } from "@/lib/auth";
import { decrypt, randomToken } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { queueEmail } from "@/lib/outbox";
import { env } from "@/lib/env";
import { str } from "@/lib/utils";

export type LoginState = { step: "password" | "totp"; error?: string; next?: string };
const MFA_COOKIE = "avrix_mfa_pending";
const secret = () => new TextEncoder().encode((process.env.AUTH_SECRET || "dev") + ":mfa");

function safeNext(n: string) {
  return n.startsWith("/admin") && !n.startsWith("//") ? n : "/admin";
}

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const ip = (await clientIp()) ?? "local";
  const next = safeNext(str(fd.get("next")));
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) return { step: "password", error: "Too many attempts. Try again in 15 minutes.", next };

  if (fd.get("step") === "totp") {
    const pending = (await cookies()).get(MFA_COOKIE)?.value;
    let uid: string | null = null;
    try { uid = pending ? ((await jwtVerify(pending, secret())).payload.uid as string) : null; } catch { uid = null; }
    if (!uid) return { step: "password", error: "Your sign-in expired. Please start again.", next };
    const user = await db.query.users.findFirst({ where: eq(t.users.id, uid) });
    if (!user?.totpSecret || !verifyTotp(str(fd.get("code")), decrypt(user.totpSecret))) {
      await audit(uid, "login_2fa_failed", "user", uid, null, ip);
      return { step: "totp", error: "That code is not valid. Check your authenticator app.", next };
    }
    (await cookies()).delete(MFA_COOKIE);
    await finishLogin(user, true, ip);
    redirect(next);
  }

  const email = str(fd.get("email")).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.query.users.findFirst({ where: eq(t.users.email, email) });
  if (user?.lockedUntil && user.lockedUntil > new Date())
    return { step: "password", error: "Account temporarily locked after failed attempts. Try again later.", next };
  if (!user || !user.active || !(await checkPassword(password, user.passwordHash))) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.update(t.users).set({ failedLogins: failed, lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(t.users.id, user.id));
      await audit(user.id, "login_failed", "user", user.id, { failed }, ip);
    }
    return { step: "password", error: "Incorrect email or password.", next };
  }
  if (user.totpEnabled) {
    const token = await new SignJWT({ uid: user.id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m").sign(secret());
    (await cookies()).set(MFA_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 300 });
    return { step: "totp", next };
  }
  await finishLogin(user, false, ip);
  redirect(user.role === "ADMIN" ? "/admin/account/security?setup=1" : next);
}

async function finishLogin(user: typeof t.users.$inferSelect, mfa: boolean, ip: string) {
  await db.update(t.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(t.users.id, user.id));
  await setSession({ uid: user.id, role: user.role, name: user.name, mfa });
  await audit(user.id, "login", "user", user.id, { mfa }, ip);
}

export async function logoutAction() {
  await clearSession();
  redirect("/admin/login");
}

export async function requestResetAction(_prev: { done?: boolean }, fd: FormData): Promise<{ done?: boolean }> {
  const ip = (await clientIp()) ?? "local";
  if (!rateLimit(`reset:${ip}`, 5, 60 * 60_000)) return { done: true };
  const email = str(fd.get("email")).toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(t.users.email, email) });
  if (user?.active) {
    const token = randomToken(24);
    await db.update(t.users).set({ resetToken: token, resetExpiresAt: new Date(Date.now() + 3_600_000) }).where(eq(t.users.id, user.id));
    await queueEmail({ to: user.email, kind: "SYSTEM", subject: "Reset your Avrix admin password",
      html: `<p>Hi ${user.name},</p><p>Use the link below to set a new password. It expires in one hour.</p><p><a href="${env.appUrl}/admin/reset/${token}">Reset password</a></p><p>If you didn't ask for this, ignore this email.</p>` });
    await audit(user.id, "password_reset_requested", "user", user.id, null, ip);
  }
  return { done: true };
}

export async function resetPasswordAction(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const token = str(fd.get("token"));
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 12) return { error: "Use at least 12 characters." };
  if (pw !== String(fd.get("confirm") ?? "")) return { error: "Passwords do not match." };
  const user = await db.query.users.findFirst({ where: eq(t.users.resetToken, token) });
  if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) return { error: "This link has expired. Request a new one." };
  await db.update(t.users).set({ passwordHash: await hashPassword(pw), resetToken: null, resetExpiresAt: null, failedLogins: 0, lockedUntil: null }).where(eq(t.users.id, user.id));
  await audit(user.id, "password_reset", "user", user.id);
  redirect("/admin/login?reset=1");
}
