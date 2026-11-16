"use client";
import { useInView } from "./useInView";

// Example reporting dashboard (clearly labelled as an example). Bars and line draw in on view.
export function DashboardMock() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const kpis = [["Enquiries", "148", "+32%"], ["Cost per lead", "£24", "−18%"], ["Booked calls", "41", "+27%"]];
  const channels: [string, number, string][] = [["Google Ads", 46, "from-[#2563eb] to-[#22d3ee]"], ["Meta Ads", 31, "from-[#7c3aed] to-[#ec4899]"], ["Organic search", 15, "from-[#16a34a] to-[#22d3ee]"], ["Email & WhatsApp", 8, "from-[#f59e0b] to-[#f97316]"]];
  const bars = [32, 40, 36, 52, 48, 64, 58, 72, 70, 86, 82, 96];
  return (
    <div ref={ref} className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[48px] bg-gradient-to-br from-[#2563eb]/25 via-[#22d3ee]/10 to-[#a78bfa]/20 blur-3xl" />
      <div className="s-card overflow-hidden p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-s-muted">This month · example dashboard</p>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-s-green"><span className="h-1.5 w-1.5 animate-s-blink rounded-full bg-current" />Live</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {kpis.map(([k, v, d], i) => (
            <div key={k} className={`rounded-xl border border-s-line bg-s-raised p-3 transition duration-700 ${inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <p className="text-[11px] text-s-muted">{k}</p>
              <p className="font-display text-xl font-bold sm:text-2xl">{v}</p>
              <p className="text-[11px] font-semibold text-s-green">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-28 items-end gap-1.5 rounded-xl border border-s-line bg-s-raised p-3">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-[#2563eb] to-[#22d3ee] transition-transform duration-700 ease-out"
              style={{ height: `${h}%`, transform: inView ? "scaleY(1)" : "scaleY(0)", transitionDelay: `${200 + i * 50}ms`, opacity: 0.5 + i * 0.04 }} />
          ))}
        </div>
        <div className="mt-5 space-y-2.5">
          {channels.map(([k, v, g], i) => (
            <div key={k} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 text-s-muted">{k}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-s-line/70">
                <span className={`block h-2 rounded-full bg-gradient-to-r ${g} transition-[width] duration-1000 ease-out`} style={{ width: inView ? `${v}%` : "0%", transitionDelay: `${500 + i * 120}ms` }} />
              </span>
              <span className="w-8 text-right font-semibold">{v}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -right-3 -top-5 hidden animate-s-float rounded-xl border border-s-line bg-s-surface px-3 py-2 text-xs shadow-soft sm:block">
        <span className="block text-s-muted">Ad spend → sales</span><span className="font-display text-base font-bold text-s-fg">Tracked end to end</span>
      </div>
    </div>
  );
}
