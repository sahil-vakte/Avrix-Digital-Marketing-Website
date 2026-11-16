"use client";
import { useEffect, useState } from "react";
import { THEME_KEY } from "./ThemeScript";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-site-theme") as Theme) || "light");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch {}
      if (!saved) apply(e.matches ? "dark" : "light", false);
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  function apply(t: Theme, persist = true) {
    document.documentElement.setAttribute("data-site-theme", t);
    if (persist) { try { localStorage.setItem(THEME_KEY, t); } catch {} }
    setTheme(t);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => apply(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-s-line bg-s-surface/80 text-s-fg transition hover:border-s-primary/50 ${className}`}
    >
      {/* Sun */}
      <svg viewBox="0 0 24 24" className={`absolute h-5 w-5 transition duration-500 ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
      </svg>
      {/* Moon */}
      <svg viewBox="0 0 24 24" className={`absolute h-5 w-5 transition duration-500 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
      </svg>
    </button>
  );
}
