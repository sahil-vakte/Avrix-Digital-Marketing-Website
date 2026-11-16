"use client";
import { useState } from "react";
import { CAPABILITIES } from "@/content/site";

export function CapabilitiesGrid() {
  const [cat, setCat] = useState<string>("All");
  const cats = ["All", ...CAPABILITIES.map((c) => c.cat)];
  const items = CAPABILITIES.filter((c) => cat === "All" || c.cat === cat).flatMap((c) => c.items.map((i) => ({ cat: c.cat, i })));
  const total = CAPABILITIES.reduce((n, c) => n + c.items.length, 0);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${cat === c ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white hover:border-brand-300"}`}>{c}</button>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-500">{cat === "All" ? `${total} capabilities` : `${items.length} in ${cat}`}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ cat: c, i }) => (
          <div key={c + i} className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm">
            <span className="block font-semibold">{i}</span><span className="text-xs text-ink-500">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
