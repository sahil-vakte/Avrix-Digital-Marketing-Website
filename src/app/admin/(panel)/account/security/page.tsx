import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, t } from "@/db";
import { checkPassword, generateTotpSecret, hashPassword, requireUser, setSession, totpUri, verifyTotp } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { str } from "@/lib/utils";

export const metadata = { title: "Account security" };

async function startTotp() {
  "use server";
  const user = await requireUser();
  await db.update(t.users).set({ totpSecret: encrypt(generateTotpSecret()), totpEnabled: false }).where(eq(t.users.id, user.id));
  redirect("/admin/account/security?step=verify");
}

async function confirmTotp(fd: FormData) {
  "use server";
  const user = await requireUser();
  if (!user.totpSecret || !verifyTotp(str(fd.get("code")), decrypt(user.totpSecret))) redirect("/admin/account/security?step=verify&error=Code+not+valid,+try+again");
  await db.update(t.users).set({ totpEnabled: true }).where(eq(t.users.id, user.id));
  await setSession({ uid: user.id, role: user.role, name: user.name, mfa: true });
  await audit(user.id, "2fa_enabled", "user", user.id);
  redirect("/admin?twofa=1");
}

async function disableTotp(fd: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin/account/security?error=Admins+must+keep+two-factor+authentication+on");
  if (!(await checkPassword(String(fd.get("password") ?? ""), user.passwordHash))) redirect("/admin/account/security?error=Incorrect+password");
  await db.update(t.users).set({ totpEnabled: false, totpSecret: null }).where(eq(t.users.id, user.id));
  await audit(user.id, "2fa_disabled", "user", user.id);
  redirect("/admin/account/security?ok=Two-factor+authentication+turned+off");
}

async function changePassword(fd: FormData) {
  "use server";
  const user = await requireUser();
  const cur = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? "");
  if (!(await checkPassword(cur, user.passwordHash))) redirect("/admin/account/security?error=Current+password+is+incorrect");
  if (next.length < 12) redirect("/admin/account/security?error=New+password+must+be+at+least+12+characters");
  if (next !== String(fd.get("confirm") ?? "")) redirect("/admin/account/security?error=Passwords+do+not+match");
  await db.update(t.users).set({ passwordHash: await hashPassword(next) }).where(eq(t.users.id, user.id));
  await audit(user.id, "password_changed", "user", user.id);
  redirect("/admin/account/security?ok=Password+changed");
}

export default async function Security({ searchParams }: { searchParams: Promise<{ step?: string; setup?: string; ok?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const verifying = sp.step === "verify" && user.totpSecret && !user.totpEnabled;
  const qr = verifying ? await QRCode.toDataURL(totpUri(user.email, decrypt(user.totpSecret!)), { margin: 1, width: 220 }) : null;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Account security" sub={`${user.name} · ${user.email}`} />
      {sp.setup && !user.totpEnabled && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Administrators must turn on two-factor authentication before using the admin panel.</p>}
      <Flash ok={sp.ok} error={sp.error} />
      <div className="space-y-6">
        <Card title="Two-factor authentication">
          {user.totpEnabled ? (
            <div className="space-y-3"><p className="text-sm text-green-700">✓ On. You'll be asked for a code from your authenticator app at each sign-in.</p>
              {user.role !== "ADMIN" && <form action={disableTotp} className="flex gap-2"><input name="password" type="password" required placeholder="Your password" className="input w-56" /><SubmitButton className="btn-ghost">Turn off</SubmitButton></form>}
            </div>
          ) : verifying ? (
            <form action={confirmTotp} className="grid gap-4 sm:grid-cols-[220px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr!} alt="QR code for your authenticator app" className="rounded-lg border" width={220} height={220} />
              <div className="space-y-3 text-sm">
                <p>1. Scan this code with Google Authenticator, Microsoft Authenticator, 1Password or similar.</p>
                <p className="text-xs text-ink-500">Can't scan? Enter this key: <code className="break-all">{decrypt(user.totpSecret!)}</code></p>
                <p>2. Enter the 6-digit code it shows:</p>
                <input name="code" inputMode="numeric" required autoFocus className="input w-40 text-center tracking-[0.3em]" />
                <SubmitButton>Turn on 2FA</SubmitButton>
              </div>
            </form>
          ) : (
            <form action={startTotp}><p className="mb-3 text-sm">Protect your account with a code from an authenticator app.</p><SubmitButton>Set up two-factor authentication</SubmitButton></form>
          )}
        </Card>
        <Card title="Change password">
          <form action={changePassword} className="grid gap-3 sm:grid-cols-3">
            <input name="current" type="password" required placeholder="Current password" className="input" autoComplete="current-password" />
            <input name="next" type="password" required minLength={12} placeholder="New password (12+ chars)" className="input" autoComplete="new-password" />
            <input name="confirm" type="password" required minLength={12} placeholder="Confirm new password" className="input" autoComplete="new-password" />
            <div><SubmitButton>Change password</SubmitButton></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
