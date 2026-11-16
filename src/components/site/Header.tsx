"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "../ui/Icon";
import { SERVICES } from "@/content/site";

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
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" aria-label="Avrix UK & Europe home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) =>
            n.children ? (
              <div key={n.label} className="relative" onMouseEnter={() => setSvc(true)} onMouseLeave={() => setSvc(false)}>
                <button className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:text-brand-600" aria-expanded={svc} onClick={() => setSvc(!svc)}>
                  {n.label} ▾
                </button>
                {svc && (
                  <div className="absolute left-0 top-full w-80 rounded-2xl border border-gray-100 bg-white p-2 shadow-card">
                    {SERVICES.map((s) => (
                      <Link key={s.slug} href={`/services/${s.slug}`} className="flex gap-3 rounded-xl p-3 hover:bg-brand-50" onClick={() => setSvc(false)}>
                        <span className="mt-0.5 text-brand-600"><Icon name={s.icon} /></span>
                        <span><span className="block text-sm font-semibold">{s.title}</span><span className="block text-xs text-ink-500">{s.short}</span></span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:text-brand-600">{n.label}</Link>
            ),
          )}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/contact#book" className="btn-ghost">Book a call</Link>
          <Link href="/contact" className="btn-primary">Get a free review</Link>
        </div>
        <button className="rounded-lg p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? "x" : "menu"} className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {SERVICES.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-lg px-2 py-2 text-sm" onClick={() => setOpen(false)}>{s.title}</Link>
            ))}
            <hr className="my-2" />
            {NAV.filter((n) => !n.children).map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-2 py-2 text-sm font-medium" onClick={() => setOpen(false)}>{n.label}</Link>
            ))}
            <Link href="/contact" className="btn-primary mt-2" onClick={() => setOpen(false)}>Get a free review</Link>
          </div>
        </div>
      )}
    </header>
  );
}
