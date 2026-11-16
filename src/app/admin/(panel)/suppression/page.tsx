import { revalidatePath } from "next/cache";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normaliseEmail, isValidSyntax } from "@/lib/email-validate";
import { Badge, Card, PageHeader, Pagination } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/buttons";
import { fmtDate, str } from "@/lib/utils";

export const metadata = { title: "Suppression list" };
const PER = 100;

async function addSuppression(fd: FormData) {
  "use server";
  const user = await requireUser();
  const emails = str(fd.get("emails")).split(/[\s,;]+/).map(normaliseEmail).filter(isValidSyntax);
  if (emails.length) {
    await db.insert(t.suppressions).values(emails.map((email) => ({ email, reason: "MANUAL" as const, note: str(fd.get("note")) || null }))).onConflictDoNothing();
    await db.execute(sql`update email_messages set status = 'CANCELLED', last_error = 'Suppressed' where status = 'QUEUED' and kind in ('CAMPAIGN','FOLLOW_UP') and to_email = any(${emails})`);
  }
  await audit(user.id, "suppress", "suppression", null, { count: emails.length });
  revalidatePath("/admin/suppression");
}

async function removeSuppression(fd: FormData) {
  "use server";
  const user = await requireUser({ admin: true });
  const id = str(fd.get("id"));
  const s = await db.query.suppressions.findFirst({ where: eq(t.suppressions.id, id) });
  if (!s || s.reason === "ERASED") return;
  await db.delete(t.suppressions).where(eq(t.suppressions.id, id));
  await audit(user.id, "unsuppress", "suppression", id, { reason: s.reason });
  revalidatePath("/admin/suppression");
}

export default async function Suppression({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const where = sp.q ? ilike(t.suppressions.email, `%${sp.q}%`) : undefined;
  const [rows, [{ n }], byReason] = await Promise.all([
    db.select().from(t.suppressions).where(where).orderBy(desc(t.suppressions.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(t.suppressions).where(where),
    db.select({ reason: t.suppressions.reason, n: sql<number>`count(*)::int` }).from(t.suppressions).groupBy(t.suppressions.reason),
  ]);
  return (
    <div>
      <PageHeader title="Suppression list" sub={`${n} address${n === 1 ? "" : "es"} that will never receive campaign email · ${byReason.map((r) => `${r.n} ${r.reason.toLowerCase().replace("_", " ")}`).join(" · ")}`} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <form className="mb-3 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Search email" className="input w-64" /><button className="btn-ghost">Search</button></form>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="table-x"><thead><tr><th>Email</th><th>Reason</th><th>Note</th><th>Added</th><th /></tr></thead><tbody>
              {rows.map((r) => <tr key={r.id}><td>{r.email}</td><td><Badge tone={r.reason === "UNSUBSCRIBED" ? "amber" : r.reason === "MANUAL" ? "gray" : "red"}>{r.reason}</Badge></td><td className="text-xs text-ink-500">{r.note}</td><td className="text-xs text-ink-500">{fmtDate(r.createdAt)}</td>
                <td>{user.role === "ADMIN" && r.reason !== "ERASED" && <form action={removeSuppression}><input type="hidden" name="id" value={r.id} /><ConfirmButton className="btn-ghost btn-sm" message={r.reason === "UNSUBSCRIBED" ? "This person unsubscribed. Only remove them if they have asked to be re-subscribed in writing. Continue?" : "Remove from the suppression list?"}>Remove</ConfirmButton></form>}</td></tr>)}
            </tbody></table>
          </div>
          <Pagination page={page} pages={Math.ceil(n / PER)} base={`/admin/suppression?q=${sp.q ?? ""}`} />
        </div>
        <Card title="Add addresses">
          <form action={addSuppression} className="space-y-3">
            <textarea name="emails" rows={6} required placeholder="One or more emails, separated by commas or new lines" className="input" />
            <input name="note" placeholder="Reason (e.g. requested by phone)" className="input" />
            <SubmitButton>Suppress</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-ink-500">Unsubscribes, hard bounces and complaints are added automatically. Erased contacts stay here so they are never re-imported.</p>
        </Card>
      </div>
    </div>
  );
}
