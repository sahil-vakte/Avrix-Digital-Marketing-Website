// Original illustrated "image cards" drawn in SVG — crisp at any size, tiny to load,
// and animated with CSS. Each scene sits on a deep navy, softly lit backdrop.
import type { CSSProperties } from "react";

export type SceneKind =
  | "browser" | "target" | "funnel" | "chat" | "chart" | "cycle"
  | "search" | "megaphone" | "document" | "pipeline" | "rocket" | "social";

const box: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
const float = (delay = 0, dur = 6): CSSProperties => ({ ...box, animation: `s-float ${dur}s ease-in-out ${delay}s infinite` });
const pulse = (delay = 0): CSSProperties => ({ ...box, animation: `s-pulse 3.2s ease-in-out ${delay}s infinite` });

export function Scene({ kind, className = "", label }: { kind: SceneKind; className?: string; label?: string }) {
  const id = `sc-${kind}`;
  return (
    <svg viewBox="0 0 320 200" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1540" />
          <stop offset="0.55" stopColor="#101c55" />
          <stop offset="1" stopColor="#1a1060" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#4f7cff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4f7cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#ffffff" strokeOpacity="0.05" />
        </pattern>
      </defs>
      <rect width="320" height="200" rx="18" fill={`url(#${id}-bg)`} />
      <rect width="320" height="200" rx="18" fill={`url(#${id}-grid)`} />
      <ellipse cx="160" cy="95" rx="150" ry="95" fill={`url(#${id}-glow)`} style={pulse()} />
      {/* soft floor shadow */}
      <ellipse cx="160" cy="172" rx="96" ry="9" fill="#000" opacity="0.35" />
      <Body kind={kind} id={id} />
    </svg>
  );
}

function Body({ kind, id }: { kind: SceneKind; id: string }) {
  const A = `url(#${id}-a)`, B = `url(#${id}-b)`, C = `url(#${id}-c)`;
  switch (kind) {
    case "browser":
      return (
        <g>
          <g style={float(0)}>
            <rect x="70" y="36" width="180" height="124" rx="12" fill="#0f1b4d" stroke="#3b5bdb" strokeOpacity=".6" />
            <rect x="70" y="36" width="180" height="20" rx="10" fill="#17266a" />
            <circle cx="84" cy="46" r="3" fill="#f87171" /><circle cx="94" cy="46" r="3" fill="#fbbf24" /><circle cx="104" cy="46" r="3" fill="#4ade80" />
            <rect x="84" y="66" width="86" height="10" rx="5" fill={A} />
            <rect x="84" y="82" width="64" height="6" rx="3" fill="#cbd5ff" opacity=".45" />
            <rect x="84" y="94" width="72" height="6" rx="3" fill="#cbd5ff" opacity=".3" />
            <rect x="84" y="110" width="46" height="16" rx="8" fill={C} />
            <rect x="180" y="66" width="56" height="60" rx="8" fill={B} opacity=".9" />
            <circle cx="208" cy="90" r="11" fill="#fff" opacity=".85" />
            <path d="M190 120l12-14 10 9 8-7 10 12z" fill="#fff" opacity=".6" />
            <rect x="84" y="136" width="152" height="12" rx="6" fill="#1e2f7a" />
          </g>
          <g style={float(1.2, 5)}>
            <rect x="226" y="122" width="62" height="40" rx="10" fill="#fff" />
            <path d="M238 146l8 6 16-16" stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="266" y="134" width="14" height="4" rx="2" fill="#cbd5e1" /><rect x="266" y="142" width="10" height="4" rx="2" fill="#cbd5e1" />
          </g>
        </g>
      );
    case "target":
      return (
        <g>
          <g style={float(0, 7)}>
            <circle cx="150" cy="100" r="56" fill="#13205e" stroke="#3b5bdb" strokeOpacity=".6" />
            <circle cx="150" cy="100" r="40" fill="none" stroke={A} strokeWidth="9" />
            <circle cx="150" cy="100" r="20" fill="none" stroke={B} strokeWidth="9" />
            <circle cx="150" cy="100" r="6" fill="#fff" />
          </g>
          <g style={float(0.6, 5)}>
            <path d="M240 40L156 98" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
            <path d="M240 40l-4 16 14-4z" fill={C} />
            <path d="M156 98l12-2-6 10z" fill="#fde68a" />
          </g>
          <g style={float(1.4, 6)}>
            <rect x="34" y="40" width="70" height="44" rx="10" fill="#fff" />
            <rect x="44" y="50" width="20" height="20" rx="5" fill={A} />
            <rect x="70" y="52" width="26" height="5" rx="2.5" fill="#94a3b8" /><rect x="70" y="62" width="18" height="5" rx="2.5" fill="#cbd5e1" />
            <text x="44" y="80" fontSize="7" fontWeight="700" fill="#2563eb" fontFamily="sans-serif">AD</text>
          </g>
        </g>
      );
    case "funnel":
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={110 + i * 20} cy="34" r="5" fill={i % 2 ? "#a78bfa" : "#60a5fa"} style={{ ...box, animation: `s-blink 1.6s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
          <g style={float(0, 7)}>
            <path d="M92 50h136l-44 56v40l-48 16v-56z" fill="#13205e" stroke="#3b5bdb" strokeOpacity=".7" />
            <path d="M92 50h136l-12 15H104z" fill={A} opacity=".9" />
            <path d="M120 84h80l-14 18h-52z" fill={B} opacity=".85" />
            <path d="M136 112h48v8h-48z" fill={C} />
          </g>
          <g style={float(1, 5)}>
            <rect x="214" y="128" width="72" height="38" rx="10" fill="#fff" />
            <text x="224" y="144" fontSize="8" fontWeight="700" fill="#0f172a" fontFamily="sans-serif">Qualified</text>
            <rect x="224" y="152" width="40" height="5" rx="2.5" fill="#22c55e" />
          </g>
          <circle cx="160" cy="176" r="6" fill="#fbbf24" style={pulse(0.4)} />
        </g>
      );
    case "chat":
      return (
        <g>
          <g style={float(0, 7)}>
            <rect x="112" y="22" width="96" height="160" rx="16" fill="#0f1b4d" stroke="#3b5bdb" strokeOpacity=".7" />
            <rect x="140" y="30" width="40" height="5" rx="2.5" fill="#1e2f7a" />
            <rect x="122" y="48" width="60" height="22" rx="9" fill="#1e2f7a" />
            <rect x="140" y="78" width="58" height="22" rx="9" fill="#22c55e" />
            <rect x="122" y="108" width="52" height="22" rx="9" fill="#1e2f7a" />
            <rect x="146" y="138" width="52" height="22" rx="9" fill="#22c55e" opacity=".85" />
          </g>
          <g style={float(0.8, 5)}>
            <rect x="34" y="60" width="64" height="44" rx="12" fill="#fff" />
            <circle cx="52" cy="82" r="3.5" fill="#64748b" style={{ ...box, animation: "s-blink 1.2s 0s infinite" }} />
            <circle cx="66" cy="82" r="3.5" fill="#64748b" style={{ ...box, animation: "s-blink 1.2s .2s infinite" }} />
            <circle cx="80" cy="82" r="3.5" fill="#64748b" style={{ ...box, animation: "s-blink 1.2s .4s infinite" }} />
            <path d="M46 104l-6 12 18-12z" fill="#fff" />
          </g>
          <g style={float(1.6, 6)}>
            <rect x="224" y="48" width="64" height="44" rx="8" fill={A} />
            <path d="M224 52l32 22 32-22" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" />
            <circle cx="284" cy="50" r="9" fill="#f43f5e" /><text x="280.5" y="54" fontSize="10" fontWeight="700" fill="#fff" fontFamily="sans-serif">1</text>
          </g>
        </g>
      );
    case "chart":
      return (
        <g>
          <g style={float(0, 7)}>
            <rect x="56" y="34" width="208" height="128" rx="12" fill="#0f1b4d" stroke="#3b5bdb" strokeOpacity=".6" />
            {[28, 44, 36, 62, 54, 78, 92].map((h, i) => (
              <rect key={i} x={76 + i * 26} y={146 - h} width="14" height={h} rx="4" fill={i === 6 ? C : A} opacity={0.55 + i * 0.06}
                style={{ ...box, transformOrigin: "bottom", animation: `s-pulse 3s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
            <path d="M76 120 L102 108 L128 112 L154 90 L180 96 L206 70 L232 54" fill="none" stroke="#f0abfc" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="8 6" style={{ animation: "s-dash 6s linear infinite" }} />
          </g>
          <g style={float(1.1, 5)}>
            <rect x="214" y="18" width="80" height="40" rx="10" fill="#fff" />
            <text x="224" y="34" fontSize="8" fill="#64748b" fontFamily="sans-serif">Revenue</text>
            <text x="224" y="49" fontSize="13" fontWeight="800" fill="#0f172a" fontFamily="sans-serif">+28%</text>
            <path d="M272 44l6-8 6 8" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </g>
      );
    case "cycle":
      return (
        <g>
          <g style={{ ...box, animation: "s-spin 18s linear infinite" }}>
            <circle cx="160" cy="100" r="58" fill="none" stroke={A} strokeWidth="8" strokeDasharray="120 60" strokeLinecap="round" />
            <path d="M214 74l8 18-20-2z" fill="#22d3ee" />
            <path d="M106 126l-8-18 20 2z" fill="#60a5fa" />
          </g>
          <g style={{ ...box, animation: "s-spin-rev 14s linear infinite" }}>
            <circle cx="160" cy="100" r="24" fill="#13205e" stroke="#a78bfa" strokeWidth="6" strokeDasharray="8 6" />
          </g>
          <circle cx="160" cy="100" r="11" fill={C} style={pulse()} />
          <g style={float(0.8, 5)}>
            <rect x="228" y="130" width="66" height="36" rx="10" fill="#fff" />
            <text x="238" y="146" fontSize="8" fill="#64748b" fontFamily="sans-serif">Test B</text>
            <text x="238" y="159" fontSize="10" fontWeight="800" fill="#16a34a" fontFamily="sans-serif">Winner</text>
          </g>
          <g style={float(1.5, 6)}>
            <rect x="26" y="34" width="66" height="36" rx="10" fill="#fff" opacity=".95" />
            <text x="36" y="50" fontSize="8" fill="#64748b" fontFamily="sans-serif">Test A</text>
            <rect x="36" y="56" width="40" height="5" rx="2.5" fill="#cbd5e1" />
          </g>
        </g>
      );
    case "search":
      return (
        <g>
          <g style={float(0, 7)}>
            <rect x="48" y="40" width="224" height="34" rx="17" fill="#fff" />
            <circle cx="70" cy="57" r="7" fill="none" stroke="#2563eb" strokeWidth="3" /><path d="M75 62l6 6" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            <rect x="90" y="53" width="96" height="8" rx="4" fill="#cbd5e1" />
            <rect x="194" y="52" width="2" height="10" fill="#2563eb" style={{ ...box, animation: "s-blink 1s steps(2) infinite" }} />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} style={float(0.5 + i * 0.4, 6 + i)}>
              <rect x="64" y={88 + i * 26} width="192" height="20" rx="8" fill={i === 0 ? "#1d3fb8" : "#13205e"} stroke="#3b5bdb" strokeOpacity=".5" />
              <rect x="74" y={95 + i * 26} width={i === 0 ? 70 : 90} height="6" rx="3" fill={i === 0 ? "#fde68a" : "#94a3b8"} opacity={i === 0 ? 1 : 0.5} />
              {i === 0 && <text x="214" y={102} fontSize="8" fontWeight="700" fill="#22d3ee" fontFamily="sans-serif">#1</text>}
            </g>
          ))}
        </g>
      );
    case "megaphone":
      return (
        <g>
          <g style={float(0, 6)}>
            <path d="M96 92l92-40v96l-92-40z" fill={A} />
            <rect x="74" y="86" width="26" height="28" rx="6" fill="#1e2f7a" stroke="#60a5fa" />
            <path d="M88 114l8 30h14l-6-30z" fill="#1e2f7a" />
            <ellipse cx="188" cy="100" rx="10" ry="48" fill="#93c5fd" />
          </g>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${212 + i * 18} ${70 - i * 8}q${18 + i * 4} 30 0 ${60 + i * 16}`} stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round"
              style={{ animation: `s-blink 1.8s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
          <g style={float(1, 5)}><circle cx="252" cy="44" r="13" fill={B} /><path d="M246 44l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
          <g style={float(1.8, 6)}><circle cx="58" cy="52" r="10" fill={C} /><text x="54.5" y="56" fontSize="10" fontWeight="800" fill="#fff" fontFamily="sans-serif">+</text></g>
        </g>
      );
    case "document":
      return (
        <g>
          <g style={float(0, 7)}>
            <rect x="100" y="28" width="120" height="148" rx="12" fill="#fff" />
            <rect x="114" y="44" width="70" height="10" rx="5" fill="#1e3a8a" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="114" y={64 + i * 12} width={i === 4 ? 56 : 92} height="5" rx="2.5" fill="#cbd5e1" />)}
            <rect x="114" y="130" width="92" height="30" rx="6" fill={A} opacity=".85" />
          </g>
          <g style={float(0.8, 5)}>
            <path d="M232 56l22-22 12 12-22 22-16 4z" fill={C} />
            <path d="M254 34l12 12" stroke="#7c2d12" strokeWidth="2" />
          </g>
          <g style={float(1.4, 6)}>
            <rect x="34" y="104" width="62" height="44" rx="10" fill={B} />
            <text x="44" y="122" fontSize="8" fill="#fff" fontFamily="sans-serif">Ranking</text>
            <text x="44" y="138" fontSize="13" fontWeight="800" fill="#fff" fontFamily="sans-serif">Top 3</text>
          </g>
        </g>
      );
    case "pipeline":
      return (
        <g>
          {[0, 1, 2].map((col) => (
            <g key={col} style={float(col * 0.5, 6 + col)}>
              <rect x={46 + col * 80} y="34" width="68" height="132" rx="12" fill="#0f1b4d" stroke="#3b5bdb" strokeOpacity=".55" />
              <rect x={56 + col * 80} y="44" width="34" height="6" rx="3" fill={col === 2 ? "#4ade80" : "#94a3b8"} />
              {Array.from({ length: 3 - col }).map((_, r) => (
                <g key={r}>
                  <rect x={54 + col * 80} y={60 + r * 32} width="52" height="24" rx="7" fill={col === 2 ? "#16a34a" : r === 0 ? "#1d3fb8" : "#17266a"} />
                  <circle cx={64 + col * 80} cy={72 + r * 32} r="5" fill="#fff" opacity=".85" />
                  <rect x={73 + col * 80} y={69 + r * 32} width="26" height="5" rx="2.5" fill="#fff" opacity=".5" />
                </g>
              ))}
            </g>
          ))}
          <path d="M106 72h16M186 72h16" stroke="#22d3ee" strokeWidth="3" strokeDasharray="4 4" style={{ animation: "s-dash 4s linear infinite" }} />
        </g>
      );
    case "rocket":
      return (
        <g>
          <g style={float(0, 4)}>
            <path d="M160 26c26 18 36 52 26 90h-52c-10-38 0-72 26-90z" fill="#e0e7ff" />
            <circle cx="160" cy="70" r="12" fill={A} stroke="#1e3a8a" strokeWidth="3" />
            <path d="M134 98l-18 24 22-4zM186 98l18 24-22-4z" fill={B} />
            <path d="M146 118h28l-6 22h-16z" fill={C} style={{ ...box, transformOrigin: "top", animation: "s-pulse .6s ease-in-out infinite" }} />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={70 + i * 60} cy={40 + (i % 2) * 110} r="2.5" fill="#fff" style={{ animation: `s-blink 2s ease-in-out ${i * 0.4}s infinite` }} />
          ))}
          <g style={float(1, 5)}>
            <rect x="222" y="58" width="70" height="36" rx="10" fill="#fff" />
            <text x="232" y="74" fontSize="8" fill="#64748b" fontFamily="sans-serif">Launch</text>
            <text x="232" y="87" fontSize="10" fontWeight="800" fill="#2563eb" fontFamily="sans-serif">Ready</text>
          </g>
        </g>
      );
    case "social":
      return (
        <g>
          <g style={float(0, 7)}>
            <rect x="118" y="24" width="84" height="152" rx="16" fill="#0f1b4d" stroke="#3b5bdb" strokeOpacity=".7" />
            <rect x="128" y="40" width="64" height="64" rx="10" fill={B} />
            <circle cx="160" cy="68" r="12" fill="#fff" opacity=".85" />
            <rect x="128" y="112" width="44" height="6" rx="3" fill="#94a3b8" />
            <rect x="128" y="124" width="56" height="6" rx="3" fill="#475569" />
            <rect x="128" y="140" width="64" height="18" rx="9" fill={A} />
          </g>
          {[[226, 60, 0], [250, 96, 0.5], [218, 128, 1]].map(([x, y, d], i) => (
            <path key={i} d={`M${x} ${y}c-6-8-18-2-12 8l12 10 12-10c6-10-6-16-12-8z`} fill={i === 1 ? "#f43f5e" : "#fb7185"}
              style={{ ...box, animation: `s-float 4s ease-in-out ${d}s infinite` }} />
          ))}
          <g style={float(1.2, 6)}>
            <rect x="30" y="70" width="68" height="38" rx="10" fill="#fff" />
            <text x="40" y="86" fontSize="8" fill="#64748b" fontFamily="sans-serif">New leads</text>
            <text x="40" y="100" fontSize="12" fontWeight="800" fill="#0f172a" fontFamily="sans-serif">+12</text>
          </g>
        </g>
      );
  }
}
