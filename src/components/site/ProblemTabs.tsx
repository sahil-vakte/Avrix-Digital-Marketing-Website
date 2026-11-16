"use client";
import { useState } from "react";
import { PROBLEMS, PROBLEM_SCENES } from "@/content/site";
import { Icon } from "../ui/Icon";
import { Scene } from "./art/Scene";

// Always-dark feature panel: pick a problem on the left, see how we fix it on the right.
export function ProblemTabs() {
  const [active, setActive] = useState(PROBLEMS[0].key);
  const idx = PROBLEMS.findIndex((x) => x.key === active);
  const p = PROBLEMS[idx];
  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-10">
      <div role="tablist" aria-label="Common problems" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible">
        {PROBLEMS.map((x, i) => (
          <button key={x.key} role="tab" aria-selected={active === x.key} aria-controls="problem-panel" onClick={() => setActive(x.key)}
            className={`group flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition lg:whitespace-normal ${active === x.key ? "border-s-primary/60 bg-s-primary/15 text-white shadow-glow" : "border-transparent text-s-muted hover:border-white/10 hover:bg-white/5 hover:text-white"}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition ${active === x.key ? "bg-gradient-to-br from-[#2563eb] to-[#22d3ee] text-white" : "bg-white/5 text-s-muted"}`}>0{i + 1}</span>
            {x.label}
          </button>
        ))}
      </div>
      <div id="problem-panel" role="tabpanel" key={p.key} className="animate-s-pop rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-s-muted">0{idx + 1} / 0{PROBLEMS.length}</span>
          <span className="s-eyebrow">The problem</span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{p.problem}</h3>
        <div className="mt-6 grid items-center gap-6 md:grid-cols-[1.15fr_1fr]">
          <Scene kind={PROBLEM_SCENES[p.key] ?? "chart"} className="w-full rounded-2xl shadow-glow" label={`Illustration: ${p.label}`} />
          <div>
            <p className="s-eyebrow"><Icon name="check" className="h-4 w-4" /> How we fix it</p>
            <ul className="mt-4 space-y-3">
              {p.fix.map((f, i) => (
                <li key={f} className="flex animate-s-pop items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-sm text-white/90" style={{ animationDelay: `${120 + i * 90}ms` }}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s-green/15 text-s-green"><Icon name="check" className="h-3.5 w-3.5" /></span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
