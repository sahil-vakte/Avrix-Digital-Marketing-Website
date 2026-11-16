export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#2347d6" />
        <path d="M9 23l7-14 7 14M11.8 18h8.4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="24.5" cy="8.5" r="2.5" fill="#ff9f1c" />
      </svg>
      <span className={`font-display text-lg font-extrabold leading-none ${light ? "text-white" : "text-ink-900"}`}>
        Avrix<span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-accent-500">UK &amp; Europe</span>
      </span>
    </span>
  );
}
