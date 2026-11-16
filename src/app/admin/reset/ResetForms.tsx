"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction, resetPasswordAction } from "../auth-actions";

export function RequestReset() {
  const [s, action, pending] = useActionState(requestResetAction, {});
  if (s.done) return <p className="text-sm text-ink-700">If that email belongs to an active account, a reset link is on its way. <Link href="/admin/login" className="text-brand-600 underline">Back to sign in</Link></p>;
  return (
    <form action={action} className="space-y-4">
      <label className="block"><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
      <button className="btn-primary w-full" disabled={pending}>Send reset link</button>
    </form>
  );
}

export function SetPassword({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {s.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{s.error}</p>}
      <label className="block"><span className="label">New password (min. 12 characters)</span><input name="password" type="password" minLength={12} required className="input" autoComplete="new-password" /></label>
      <label className="block"><span className="label">Confirm password</span><input name="confirm" type="password" minLength={12} required className="input" autoComplete="new-password" /></label>
      <button className="btn-primary w-full" disabled={pending}>Set password</button>
    </form>
  );
}
