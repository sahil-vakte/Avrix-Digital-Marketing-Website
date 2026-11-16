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
    return <div className="s-card p-8 text-center"><h3 className="font-display text-2xl font-bold">You're booked in.</h3><p className="mt-2 text-s-muted">{msg}. A confirmation email is on its way.</p></div>;

  return (
    <form onSubmit={book} className="s-card p-6 sm:p-8">
      <p className="mb-3 text-sm font-semibold text-s-fg">1. Choose a day</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((d) => {
          const v = d.toISOString().slice(0, 10);
          return (
            <button type="button" key={v} onClick={() => setDate(v)} aria-pressed={date === v}
              className={`min-w-[72px] rounded-xl border px-3 py-2 text-center text-sm ${date === v ? "border-transparent bg-gradient-to-br from-[#2563eb] to-[#4f7cff] text-white shadow-glow" : "border-s-line hover:border-s-primary/50"}`}>
              <span className="block text-xs">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="block font-bold">{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </button>
          );
        })}
      </div>
      <p className="mb-3 mt-6 text-sm font-semibold text-s-fg">2. Pick a time (UK time)</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots === null && <p className="col-span-full text-sm text-s-muted">Loading times…</p>}
        {slots?.length === 0 && <p className="col-span-full text-sm text-s-muted">No times left on this day — try another.</p>}
        {slots?.map((s) => (
          <button type="button" key={s.start} onClick={() => setSlot(s.start)} aria-pressed={slot === s.start}
            className={`rounded-lg border px-2 py-2 text-sm ${slot === s.start ? "border-s-primary bg-s-primary/10 font-semibold text-s-primary" : "border-s-line hover:border-s-primary/50"}`}>{s.label}</button>
        ))}
      </div>
      <p className="mb-3 mt-6 text-sm font-semibold text-s-fg">3. Your details</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Name *" className="s-input" autoComplete="name" />
        <input name="email" type="email" required placeholder="Email *" className="s-input" autoComplete="email" />
        <input name="phone" type="tel" placeholder="Phone" className="s-input" autoComplete="tel" />
        <input name="businessName" placeholder="Business name" className="s-input" autoComplete="organization" />
        <input name="topic" placeholder="What would you like to discuss?" className="s-input sm:col-span-2" />
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>
      {state === "error" && <p className="mt-3 text-sm text-red-500" role="alert">{msg}</p>}
      <button className="s-btn-primary mt-5" disabled={!slot || state === "sending"}>{state === "sending" ? "Booking…" : "Confirm booking"}</button>
    </form>
  );
}
