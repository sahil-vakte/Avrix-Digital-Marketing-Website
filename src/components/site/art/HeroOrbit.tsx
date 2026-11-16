// Animated hero visual: the Avrix growth system as a glowing hub with six orbiting parts.
const NODES = [
  { k: "BUILD", s: "Websites · Pages", c: "from-[#2563eb] to-[#22d3ee]", icon: "M4 5h16v14H4zM4 9h16M9 19V9" },
  { k: "ATTRACT", s: "Google · Meta · SEO", c: "from-[#7c3aed] to-[#ec4899]", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { k: "CONVERT", s: "Forms · Booking", c: "from-[#f59e0b] to-[#f97316]", icon: "M3 5h18l-7 8v6l-4 2v-8z" },
  { k: "NURTURE", s: "Email · WhatsApp", c: "from-[#16a34a] to-[#22d3ee]", icon: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" },
  { k: "MEASURE", s: "GA4 · CRM · Sales", c: "from-[#0ea5e9] to-[#6366f1]", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { k: "IMPROVE", s: "Tests · Optimise", c: "from-[#a855f7] to-[#3b82f6]", icon: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" },
];

export function HeroOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden="true">
      {/* rings */}
      <svg viewBox="0 0 560 560" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="ho-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#4f7cff" stopOpacity=".55" />
            <stop offset=".6" stopColor="#22d3ee" stopOpacity=".12" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ho-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" /><stop offset=".5" stopColor="#22d3ee" /><stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <path id="ho-path" d="M280 67a213 213 0 1 1 0 426a213 213 0 1 1 0-426" />
        </defs>
        <circle cx="280" cy="280" r="250" fill="url(#ho-core)" className="animate-s-pulse" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        <g className="animate-s-spin" style={{ transformOrigin: "280px 280px" }}>
          <circle cx="280" cy="280" r="213" fill="none" stroke="url(#ho-ring)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
        </g>
        <g className="animate-s-spin-rev" style={{ transformOrigin: "280px 280px" }}>
          <circle cx="280" cy="280" r="150" fill="none" stroke="url(#ho-ring)" strokeOpacity=".7" strokeWidth="1.5" strokeDasharray="60 18" />
        </g>
        <circle cx="280" cy="280" r="213" fill="none" stroke="rgb(var(--s-line))" strokeOpacity=".6" />
        {/* spokes */}
        {NODES.map((_, i) => {
          const a = (-90 + i * 60) * (Math.PI / 180);
          return <line key={i} x1={280 + 98 * Math.cos(a)} y1={280 + 98 * Math.sin(a)} x2={280 + 190 * Math.cos(a)} y2={280 + 190 * Math.sin(a)}
            stroke="url(#ho-ring)" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="4 6" className="animate-s-dash" />;
        })}
        {/* light pulses travelling round the ring */}
        {[0, 2.5, 5].map((d) => (
          <circle key={d} r="5" fill="#22d3ee">
            <animateMotion dur="7.5s" begin={`-${d}s`} repeatCount="indefinite"><mpath href="#ho-path" /></animateMotion>
          </circle>
        ))}
      </svg>

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#0b1a52] via-[#102a7a] to-[#2b1a7a] text-center text-white shadow-[0_0_80px_-10px_rgba(59,130,246,.8)]">
        <span className="absolute inset-0 animate-s-pulse rounded-full ring-1 ring-cyan-300/30" />
        <span className="font-display text-xl font-bold tracking-[0.18em] sm:text-2xl">AVRIX</span>
        <span className="mt-1 px-4 text-[9px] font-medium uppercase tracking-[0.16em] text-cyan-200/80 sm:text-[10px]">Growth system</span>
      </div>

      {/* nodes */}
      {NODES.map((n, i) => {
        const a = (-90 + i * 60) * (Math.PI / 180);
        const x = 50 + 38 * Math.cos(a), y = 50 + 38 * Math.sin(a);
        return (
          <div key={n.k} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            <div className="animate-s-float rounded-2xl border border-s-line bg-s-surface/90 p-2.5 shadow-soft backdrop-blur sm:p-3" style={{ animationDelay: `${i * 0.7}s` }}>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${n.c} text-white shadow-md sm:h-9 sm:w-9`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                </span>
                <span className="hidden min-[420px]:block">
                  <span className="block text-[11px] font-bold tracking-[0.14em] text-s-fg">{n.k}</span>
                  <span className="block whitespace-nowrap text-[10px] text-s-muted">{n.s}</span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
