"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "../auth-actions";

export function LoginForm({ next, reset }: { next: string; reset: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "password", next });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={state.next ?? next} />
      {reset && !state.error && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Password updated — please sign in.</p>}
      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{state.error}</p>}
      {state.step === "totp" ? (
        <>
          <input type="hidden" name="step" value="totp" />
          <label className="block"><span className="label">6-digit code from your authenticator app</span>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus className="input text-center text-lg tracking-[0.4em]" /></label>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Checking…" : "Verify"}</button>
        </>
      ) : (
        <>
          <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="username" className="input" autoFocus /></label>
          <label className="block"><span className="label">Password</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
          <p className="text-center text-xs"><Link href="/admin/reset" className="text-brand-600 hover:underline">Forgotten your password?</Link></p>
        </>
      )}
    </form>
  );
}
