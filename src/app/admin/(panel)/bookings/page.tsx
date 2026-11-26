import Link from "next/link";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { appScope, canSeeApplication, inScopeOrShared } from "@/lib/apps";
import { db, t } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { addActivity } from "@/lib/crm";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { fmtDate, str } from "@/lib/utils";

export const metadata = { title: "Bookings" };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function saveAvailability(fd: FormData) {
  "use server";
  await requireUser({ admin: true });
  const days = fd.getAll("days").map(Number);
  await setSetting("booking", {
    days, startHour: Number(fd.get("startHour")), endHour: Number(fd.get("endHour")), slotMinutes: Number(fd.get("slotMinutes")),
    timezone: str(fd.get("timezone")) || "Europe/London", leadDays: Number(fd.get("leadDays") || 21),
  });
  revalidatePath("/admin/bookings");
}

async function setBookingStatus(fd: FormData) {
  "use server";
  const user = await requireUser();
  const id = str(fd.get("id"));
  const status = str(fd.get("status")) as "CONFIRMED" | "CANCELLED" | "COMPLETED";
  const existing = await db.query.bookings.findFirst({ where: eq(t.bookings.id, id) });
  if (!existing || (existing.applicationId && !(await canSeeApplication(user, existing.applicationId)))) return;
  const [b] = await db.update(t.bookings).set({ status }).where(eq(t.bookings.id, id)).returning();
  if (b?.leadId) await addActivity(b.leadId, "meeting", `Call marked ${status.toLowerCase()} by ${user.name}`);
  revalidatePath("/admin/bookings");
}

export default async function Bookings() {
  const user = await requireUser();
  const s = await getSetting("booking");
  const scope = await appScope(user);
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.select().from(t.bookings).where(and(gte(t.bookings.startsAt, now), inScopeOrShared(t.bookings.applicationId, scope, user))).orderBy(asc(t.bookings.startsAt)),
    db.select().from(t.bookings).where(and(lt(t.bookings.startsAt, now), inScopeOrShared(t.bookings.applicationId, scope, user))).orderBy(desc(t.bookings.startsAt)).limit(30),
  ]);
  const Row = ({ b }: { b: typeof upcoming[number] }) => (
    <tr><td className="whitespace-nowrap">{fmtDate(b.startsAt, true)}</td><td>{b.leadId ? <Link href={`/admin/leads/${b.leadId}`} className="font-semibold hover:underline">{b.name}</Link> : b.name}<div className="text-xs text-ink-500">{b.email} {b.phone}</div></td><td className="text-sm">{b.topic}</td><td><Badge>{b.status}</Badge></td>
      <td><form action={setBookingStatus} className="flex gap-1"><input type="hidden" name="id" value={b.id} />
        {b.status !== "COMPLETED" && <SubmitButton className="btn-ghost btn-sm" name="status" value="COMPLETED">Done</SubmitButton>}
        {b.status === "CONFIRMED" && <SubmitButton className="btn-ghost btn-sm" name="status" value="CANCELLED">Cancel</SubmitButton>}</form></td></tr>
  );
  return (
    <div>
      <PageHeader title="Bookings" sub="Calls booked from the website's Contact page." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title={`Upcoming (${upcoming.length})`}><table className="table-x"><tbody>{upcoming.map((b) => <Row key={b.id} b={b} />)}</tbody></table>{!upcoming.length && <p className="text-sm text-ink-500">No upcoming calls.</p>}</Card>
          <Card title="Past"><table className="table-x"><tbody>{past.map((b) => <Row key={b.id} b={b} />)}</tbody></table></Card>
        </div>
        <Card title="Availability">
          <form action={saveAvailability} className="space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" name="days" value={i + 1} defaultChecked={s.days.includes(i + 1)} disabled={user.role !== "ADMIN"} />{d}</label>)}</div>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">From</span><select name="startHour" defaultValue={s.startHour} className="input">{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
              <label><span className="label">To</span><select name="endHour" defaultValue={s.endHour} className="input">{Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{h + 1}:00</option>)}</select></label>
              <label><span className="label">Call length</span><select name="slotMinutes" defaultValue={s.slotMinutes} className="input">{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
              <label><span className="label">Bookable days ahead</span><input name="leadDays" type="number" min={1} max={90} defaultValue={s.leadDays} className="input" /></label>
              <label className="col-span-2"><span className="label">Time zone</span><input name="timezone" defaultValue={s.timezone} className="input" /></label>
            </div>
            {user.role === "ADMIN" ? <SubmitButton>Save availability</SubmitButton> : <p className="text-xs text-ink-500">Only admins can change availability.</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
