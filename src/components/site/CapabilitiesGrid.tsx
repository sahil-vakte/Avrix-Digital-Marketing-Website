"use client";
import { useState } from "react";
import { CAPABILITIES } from "@/content/site";
import { Icon } from "../ui/Icon";

export function CapabilitiesGrid() {
  const [cat, setCat] = useState<string>(CAPABILITIES[0].cat);
  const cur = CAPABILITIES.find((c) => c.cat === cat)!;
  return (
    <div className="s-card overflow-hidden">
      <div role="tablist" aria-label="Capability categories" className="flex gap-1 overflow-x-auto border-b border-s-line bg-s-soft p-2">
        {CAPABILITIES.map((c) => (
          <button key={c.cat} role="tab" aria-selected={cat === c.cat} onClick={() => setCat(c.cat)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${cat === c.cat ? "bg-gradient-to-r from-[#2563eb] to-[#4f7cff] text-white shadow-glow" : "text-s-muted hover:bg-s-surface hover:text-s-fg"}`}>
            {c.cat}
          </button>
        ))}
      </div>
      <div key={cat} className="p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold">{cur.cat}</h3>
          <span className="rounded-xl bg-s-primary/10 px-3 py-1.5 text-sm font-bold text-s-primary">{cur.items.length} capabilities</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cur.items.map((i, n) => (
            <div key={i} className="flex animate-s-pop items-center gap-3 rounded-xl border border-s-line bg-s-raised px-4 py-3.5 text-sm font-medium" style={{ animationDelay: `${n * 50}ms` }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-s-green/10 text-s-green"><Icon name="check" className="h-4 w-4" /></span>{i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
