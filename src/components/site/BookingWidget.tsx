"use client";
import { useEffect, useMemo, useState } from "react";
import { readUtm } from "./UtmCapture";

type Slot = { start: string; label: string };

export function BookingWidget({ days, leadDays }: { days: number[]; leadDays: number }) {
  const dates = useMemo(() => {
    const out: Date[] = [];
    const d = new Date(); d.setHours(12, 0, 0, 0);
    for (let i = 1; out.length < 10 && i <= leadDays; i++) {
      const x = new Date(d.getTime() + i * 86_400_000);
      const iso = ((x.getDay() + 6) % 7) + 1;
      if (days.includes(iso)) out.push(x);
    }
    return out;
  }, [days, leadDays]);
  const [date, setDate] = useState(() => dates[0]?.toISOString().slice(0, 10) ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string>("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!date) return;
    setSlots(null); setSlot("");
    fetch(`/api/booking/slots?date=${date}`).then((r) => r.json()).then((j) => setSlots(j.slots ?? [])).catch(() => setSlots([]));
  }, [date]);

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setState("sending");
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/booking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...fd, start: slot, utm: readUtm() }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setState("done"); setMsg(j.when ?? ""); } else { setState("error"); setMsg(j.error ?? "That slot is no longer available."); }
  }

  if (state === "done")
    return <div className="card p-8 text-center"><h3 className="font-display text-2xl font-bold">You're booked in.</h3><p className="mt-2 text-ink-500">{msg}. A confirmation email is on its way.</p></div>;

  return (
    <form onSubmit={book} className="card p-6 sm:p-8">
      <p className="label">1. Choose a day</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((d) => {
          const v = d.toISOString().slice(0, 10);
          return (
            <button type="button" key={v} onClick={() => setDate(v)} aria-pressed={date === v}
              className={`min-w-[72px] rounded-xl border px-3 py-2 text-center text-sm ${date === v ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 hover:border-brand-300"}`}>
              <span className="block text-xs">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="block font-bold">{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </button>
          );
        })}
      </div>
      <p className="label mt-4">2. Pick a time (UK time)</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots === null && <p className="col-span-full text-sm text-ink-500">Loading times…</p>}
        {slots?.length === 0 && <p className="col-span-full text-sm text-ink-500">No times left on this day — try another.</p>}
        {slots?.map((s) => (
          <button type="button" key={s.start} onClick={() => setSlot(s.start)} aria-pressed={slot === s.start}
            className={`rounded-lg border px-2 py-2 text-sm ${slot === s.start ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-gray-200 hover:border-brand-300"}`}>{s.label}</button>
        ))}
      </div>
      <p className="label mt-4">3. Your details</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Name *" className="input" autoComplete="name" />
        <input name="email" type="email" required placeholder="Email *" className="input" autoComplete="email" />
        <input name="phone" type="tel" placeholder="Phone" className="input" autoComplete="tel" />
        <input name="businessName" placeholder="Business name" className="input" autoComplete="organization" />
        <input name="topic" placeholder="What would you like to discuss?" className="input sm:col-span-2" />
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>
      {state === "error" && <p className="mt-3 text-sm text-red-600" role="alert">{msg}</p>}
      <button className="btn-primary mt-5" disabled={!slot || state === "sending"}>{state === "sending" ? "Booking…" : "Confirm booking"}</button>
    </form>
  );
}
