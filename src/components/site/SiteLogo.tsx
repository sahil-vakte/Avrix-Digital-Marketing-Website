// Public-site logo (theme-aware). The admin panel keeps using Logo.tsx unchanged.
export function SiteLogo({ forceLight = false }: { forceLight?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden="true">
        <defs>
          <linearGradient id="sl-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill="url(#sl-g)" />
        <path d="M10.5 26l7.5-16 7.5 16M13.4 20.4h9.2" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="27.5" cy="9" r="2.6" fill="#fbbf24" />
      </svg>
      <span className={`font-display text-lg font-bold leading-none tracking-tight ${forceLight ? "text-white" : "text-s-fg"}`}>
        Avrix
        <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-[0.2em] text-s-cyan">UK &amp; Europe</span>
      </span>
    </span>
  );
}
