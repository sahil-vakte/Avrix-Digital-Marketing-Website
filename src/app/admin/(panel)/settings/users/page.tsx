import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate } from "@/lib/utils";
import { saveUser } from "../actions";

export const metadata = { title: "Users" };

export default async function Users({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireUser({ admin: true });
  const sp = await searchParams;
  const users = await db.select().from(t.users).orderBy(asc(t.users.name));
  return (
    <div className="max-w-5xl">
      <PageHeader title="Users" actions={<Link href="/admin/settings" className="btn-ghost">Back</Link>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="space-y-3">
        {users.map((u) => (
          <form key={u.id} action={saveUser} className="grid items-end gap-2 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_1fr_120px_1fr_auto]">
            <input type="hidden" name="id" value={u.id} />
            <label><span className="label">Name</span><input name="name" defaultValue={u.name} className="input" /></label>
            <div><span className="label">Email</span><p className="py-2 text-sm">{u.email}</p></div>
            <label><span className="label">Role</span><select name="role" defaultValue={u.role} className="input"><option value="ADMIN">Admin</option><option value="STAFF">Staff</option></select></label>
            <label><span className="label">New password (optional)</span><input name="password" type="password" minLength={12} className="input" autoComplete="new-password" /></label>
            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={u.active} disabled={u.id === me.id} /> Active</label>
              <label className="flex items-center gap-1"><input type="checkbox" name="reset2fa" /> Reset 2FA</label>
              <SubmitButton className="btn-ghost btn-sm">Save</SubmitButton>
            </div>
            <p className="text-xs text-ink-500 md:col-span-5"><Badge tone={u.totpEnabled ? "green" : "amber"}>{u.totpEnabled ? "2FA on" : "2FA off"}</Badge> Last login {fmtDate(u.lastLoginAt, true)}{u.lockedUntil && u.lockedUntil > new Date() ? " · locked" : ""}</p>
          </form>
        ))}
      </div>
      <Card title="Invite a user" className="mt-6">
        <form action={saveUser} className="grid items-end gap-3 md:grid-cols-5">
          <label><span className="label">Name</span><input name="name" required className="input" /></label>
          <label><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
          <label><span className="label">Role</span><select name="role" className="input"><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></label>
          <label><span className="label">Temporary password</span><input name="password" type="password" minLength={12} required className="input" autoComplete="new-password" /></label>
          <SubmitButton>Create user</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-ink-500">Share the temporary password securely. Admins must set up two-factor authentication at first sign-in.</p>
      </Card>
    </div>
  );
}
