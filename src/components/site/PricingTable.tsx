"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "../ui/Icon";

export type Plan = { id: string; name: string; tagline: string | null; priceGbp: string; priceEur: string; period: string; features: string[]; highlight: boolean };

export function PricingTable({ plans }: { plans: Plan[] }) {
  const [cur, setCur] = useState<"GBP" | "EUR">("GBP");
  const fmt = (v: string) => new Intl.NumberFormat(cur === "GBP" ? "en-GB" : "en-IE", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(v));
  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div className="relative inline-flex rounded-full border border-s-line bg-s-surface p-1 shadow-soft" role="group" aria-label="Currency">
          <span className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#2563eb] to-[#4f7cff] shadow-glow transition-transform duration-300 ${cur === "EUR" ? "translate-x-full" : "translate-x-0"}`} style={{ left: 4 }} />
          {(["GBP", "EUR"] as const).map((c) => (
            <button key={c} onClick={() => setCur(c)} aria-pressed={cur === c}
              className={`relative z-10 w-28 rounded-full py-2 text-sm font-semibold transition ${cur === c ? "text-white" : "text-s-muted"}`}>{c === "GBP" ? "£ GBP" : "€ EUR"}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p, i) => (
          <div key={p.id} data-reveal data-reveal-delay={String(i * 90)}
            className={`relative flex flex-col rounded-3xl p-[1px] ${p.highlight ? "bg-gradient-to-b from-[#3b82f6] via-[#22d3ee] to-[#a78bfa] shadow-glow" : "bg-s-line"}`}>
            <div className={`flex h-full flex-col rounded-[23px] p-6 ${p.highlight ? "s-dark bg-navy-900" : "bg-s-surface"}`}>
              {p.highlight && <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-[#2563eb] to-[#22d3ee] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">★ Most popular</span>}
              <h3 className="font-display text-xl font-bold text-s-fg">{p.name}</h3>
              <p className="mt-1 min-h-[40px] text-sm text-s-muted">{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span key={cur} className="animate-s-pop font-display text-4xl font-bold text-s-fg">{fmt(cur === "GBP" ? p.priceGbp : p.priceEur)}</span>
                <span className="text-sm text-s-muted">{p.period === "month" ? "/ month" : "one-off"}</span>
              </p>
              <p className="text-xs text-s-muted">excl. VAT and ad spend</p>
              <ul className="mt-6 flex-1 space-y-2.5 border-t border-s-line pt-6 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2.5 text-s-fg/90"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-s-green" />{f}</li>)}
              </ul>
              <Link href={`/contact?plan=${encodeURIComponent(p.name)}`} className={`${p.highlight ? "s-btn-light" : "s-btn-ghost"} mt-7 w-full`}>Ask about {p.name}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
