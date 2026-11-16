"use client";
import { useState } from "react";
import { readUtm } from "./UtmCapture";
import { SERVICES } from "@/content/site";
import { COUNTRIES } from "@/lib/countries";

export function ContactForm({ defaultService = "", compact = false }: { defaultService?: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending"); setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/contact", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, marketingConsent: fd.get("marketingConsent") === "on", utm: readUtm() }),
    }).catch(() => null);
    if (res?.ok) {
      setState("done");
      const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
      w.gtag?.("event", "generate_lead"); w.fbq?.("track", "Lead");
    } else {
      setState("error");
      setError((await res?.json().catch(() => null))?.error ?? "Something went wrong. Please try again or WhatsApp us.");
    }
  }

  if (state === "done")
    return (
      <div className="s-card p-8 text-center">
        <h3 className="font-display text-2xl font-bold">Thanks — we have your message.</h3>
        <p className="mt-2 text-s-muted">Someone from the team will reply within one working day.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="s-card grid gap-4 p-6 sm:grid-cols-2 sm:p-8" noValidate={false}>
      <div><label className="s-label" htmlFor="cf-name">Your name *</label><input id="cf-name" name="name" required className="s-input" autoComplete="name" /></div>
      <div><label className="s-label" htmlFor="cf-biz">Business name *</label><input id="cf-biz" name="businessName" required className="s-input" autoComplete="organization" /></div>
      <div><label className="s-label" htmlFor="cf-email">Work email *</label><input id="cf-email" name="email" type="email" required className="s-input" autoComplete="email" /></div>
      <div><label className="s-label" htmlFor="cf-phone">Phone</label><input id="cf-phone" name="phone" type="tel" className="s-input" autoComplete="tel" /></div>
      <div>
        <label className="s-label" htmlFor="cf-country">Country *</label>
        <select id="cf-country" name="country" required className="s-input" defaultValue="GB">
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="s-label" htmlFor="cf-service">What do you need help with?</label>
        <select id="cf-service" name="service" className="s-input" defaultValue={defaultService}>
          <option value="">Not sure yet</option>
          {SERVICES.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
        </select>
      </div>
      {!compact && (
        <div className="sm:col-span-2">
          <label className="s-label" htmlFor="cf-budget">Monthly marketing budget</label>
          <select id="cf-budget" name="budget" className="s-input" defaultValue="">
            <option value="">Prefer not to say</option>
            <option>Under £1,000 / €1,150</option>
            <option>£1,000–£3,000 / €1,150–€3,500</option>
            <option>£3,000–£10,000 / €3,500–€11,500</option>
            <option>Over £10,000 / €11,500</option>
          </select>
        </div>
      )}
      <div className="sm:col-span-2"><label className="s-label" htmlFor="cf-msg">Message *</label><textarea id="cf-msg" name="message" required rows={compact ? 3 : 5} className="s-input" placeholder="Tell us what you want to improve…" /></div>
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="flex items-start gap-2 text-xs text-s-muted sm:col-span-2">
        <input type="checkbox" name="marketingConsent" className="mt-0.5 accent-[#2563eb]" />
        I'd like to receive occasional marketing emails from Avrix UK &amp; Europe. You can unsubscribe at any time.
      </label>
      <p className="text-xs text-s-muted sm:col-span-2">We use your details to reply to your enquiry. See our <a href="/privacy" className="underline">privacy policy</a>.</p>
      {error && <p className="text-sm text-red-500 sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2"><button className="s-btn-primary w-full sm:w-auto" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
