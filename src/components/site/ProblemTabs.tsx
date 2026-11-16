"use client";
import { useState } from "react";
import { PROBLEMS } from "@/content/site";
import { Icon } from "../ui/Icon";

export function ProblemTabs() {
  const [active, setActive] = useState(PROBLEMS[0].key);
  const p = PROBLEMS.find((x) => x.key === active)!;
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div role="tablist" aria-label="Common problems" className="flex gap-2 overflow-x-auto lg:flex-col">
        {PROBLEMS.map((x) => (
          <button key={x.key} role="tab" aria-selected={active === x.key} onClick={() => setActive(x.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active === x.key ? "bg-brand-600 text-white shadow" : "bg-white text-ink-700 hover:bg-brand-50"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="card p-8">
        <p className="eyebrow">The problem</p>
        <h3 className="mt-2 font-display text-2xl font-bold">{p.problem}</h3>
        <p className="eyebrow mt-8">How we fix it</p>
        <ul className="mt-3 space-y-3">
          {p.fix.map((f) => (
            <li key={f} className="flex gap-3"><span className="mt-0.5 rounded-full bg-green-100 p-1 text-green-700"><Icon name="check" className="h-3.5 w-3.5" /></span>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
