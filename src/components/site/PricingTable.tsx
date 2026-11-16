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
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1" role="group" aria-label="Currency">
          {(["GBP", "EUR"] as const).map((c) => (
            <button key={c} onClick={() => setCur(c)} aria-pressed={cur === c}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold ${cur === c ? "bg-brand-600 text-white" : "text-ink-700"}`}>{c === "GBP" ? "£ GBP" : "€ EUR"}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className={`card flex flex-col p-6 ${p.highlight ? "ring-2 ring-brand-600" : ""}`}>
            {p.highlight && <span className="badge mb-3 w-fit bg-brand-600 text-white">Most popular</span>}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-ink-500">{p.tagline}</p>
            <p className="mt-5"><span className="font-display text-4xl font-extrabold">{fmt(cur === "GBP" ? p.priceGbp : p.priceEur)}</span>
              <span className="text-sm text-ink-500"> {p.period === "month" ? "/ month" : "one-off"}</span></p>
            <p className="text-xs text-ink-500">excl. VAT and ad spend</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => <li key={f} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />{f}</li>)}
            </ul>
            <Link href={`/contact?plan=${encodeURIComponent(p.name)}`} className={`${p.highlight ? "btn-primary" : "btn-ghost"} mt-6 w-full`}>Ask about {p.name}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
