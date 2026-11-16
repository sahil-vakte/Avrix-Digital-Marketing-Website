"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteLogo } from "./SiteLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Icon } from "../ui/Icon";
import { Scene } from "./art/Scene";
import { SERVICES, SERVICE_SCENES } from "@/content/site";

const NAV = [
  { href: "/#services", label: "Services", children: true },
  { href: "/pricing", label: "Pricing" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/blog", label: "Insights" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [svc, setSvc] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setOpen(false); setSvc(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const active = (href: string) => href !== "/#services" && pathname.startsWith(href);

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "border-b border-s-line bg-s-bg/80 shadow-soft backdrop-blur-xl" : "border-b border-transparent bg-s-bg/40 backdrop-blur"}`}>
      <div className="s-container flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="Avrix UK & Europe home" className="shrink-0"><SiteLogo /></Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) =>
            n.children ? (
              <div key={n.label} className="relative" onMouseEnter={() => setSvc(true)} onMouseLeave={() => setSvc(false)}>
                <button className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition hover:text-s-primary ${pathname.startsWith("/services") ? "text-s-primary" : "text-s-fg/80"}`}
                  aria-expanded={svc} aria-haspopup="true" onClick={() => setSvc(!svc)}>
                  {n.label}
                  <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${svc ? "rotate-180" : ""}`} fill="currentColor" aria-hidden="true"><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" /></svg>
                </button>
                <div className={`absolute left-1/2 top-full w-[720px] -translate-x-1/2 pt-3 transition duration-200 ${svc ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
                  <div className="grid grid-cols-[1fr_1fr_220px] gap-1 rounded-2xl border border-s-line bg-s-surface p-3 shadow-glow">
                    {SERVICES.map((s) => (
                      <Link key={s.slug} href={`/services/${s.slug}`} className="group flex gap-3 rounded-xl p-3 transition hover:bg-s-soft" style={{ gridColumn: "auto" }}>
                        <span className="s-icon-tile h-10 w-10 shrink-0 transition group-hover:scale-110"><Icon name={s.icon} /></span>
                        <span><span className="block text-sm font-semibold text-s-fg">{s.title}</span><span className="mt-0.5 block text-xs leading-snug text-s-muted">{s.short}</span></span>
                      </Link>
                    ))}
                    <Link href="/contact" className="s-dark col-start-3 row-span-3 row-start-1 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-navy-900 p-3">
                      <Scene kind={SERVICE_SCENES["google-ads"]} className="w-full" />
                      <span className="mt-3 text-sm font-semibold text-white">Not sure where to start?</span>
                      <span className="mt-1 text-xs text-s-muted">Get a free review of your ads, website and follow-up.</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-s-cyan">Get a free review <Icon name="arrow" className="h-3.5 w-3.5" /></span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={n.href} href={n.href} className={`relative rounded-lg px-3 py-2 text-sm font-medium transition hover:text-s-primary ${active(n.href) ? "text-s-primary" : "text-s-fg/80"}`}>
                {n.label}
                {active(n.href) && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#22d3ee]" />}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/contact#book" className="s-btn-ghost hidden px-4 py-2.5 xl:inline-flex">Book a call</Link>
          <Link href="/contact" className="s-btn-primary hidden px-4 py-2.5 sm:inline-flex">Get a free review</Link>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-s-line bg-s-surface/80 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`absolute inset-x-0 top-full z-40 h-[calc(100dvh-72px)] overflow-y-auto border-t border-s-line bg-s-bg transition duration-300 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <div className="s-container flex flex-col gap-1 py-6">
          <p className="s-eyebrow mb-2">Services</p>
          {SERVICES.map((s, i) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-[15px] font-medium transition duration-500 ${open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`} style={{ transitionDelay: `${i * 40}ms` }}>
              <span className="s-icon-tile h-9 w-9"><Icon name={s.icon} className="h-4 w-4" /></span>{s.title}
            </Link>
          ))}
          <hr className="my-3 border-s-line" />
          {NAV.filter((n) => !n.children).map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl px-2 py-2.5 text-[15px] font-medium">{n.label}</Link>
          ))}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/contact" className="s-btn-primary">Get a free review</Link>
            <Link href="/contact#book" className="s-btn-ghost">Book a call</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
