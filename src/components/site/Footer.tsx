import Link from "next/link";
import { SiteLogo } from "./SiteLogo";
import { Icon } from "../ui/Icon";
import { SERVICES, SITE } from "@/content/site";

export function Footer({ phone, address, email }: { phone: string; address: string; email?: string }) {
  return (
    <footer className="s-dark relative overflow-hidden bg-navy-950 text-s-muted">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-[#2563eb]/20 blur-3xl" />
      <div className="s-container relative">
        {/* CTA band */}
        <div className="relative -mb-px flex flex-col items-start justify-between gap-6 border-b border-white/10 py-14 md:flex-row md:items-center">
          <div>
            <p className="s-eyebrow">Free marketing review</p>
            <h2 className="mt-3 max-w-xl font-display text-2xl font-bold text-white sm:text-3xl">Find out what's holding your enquiries back — in one short call.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="s-btn-primary">Get a free review <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link href="/contact#book" className="s-btn border border-white/15 bg-white/5 text-white hover:bg-white/10"><Icon name="calendar" className="h-4 w-4" /> Book a call</Link>
          </div>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <SiteLogo forceLight />
            <p className="mt-5 max-w-sm text-sm leading-6">{SITE.description}</p>
            <p className="mt-4 text-xs text-s-muted/80">Part of <a href={SITE.parent.url} className="underline hover:text-white">{SITE.parent.name}</a>.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Services</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SERVICES.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`} className="transition hover:text-white">{s.title}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[["/about", "About"], ["/pricing", "Pricing"], ["/case-studies", "Case studies"], ["/blog", "Insights"], ["/contact", "Contact"]].map(([h, l]) => (
                <li key={h}><Link href={h} className="transition hover:text-white">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Get in touch</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {phone && <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2 transition hover:text-white"><Icon name="phone" className="h-4 w-4 text-s-cyan" />{phone}</a></li>}
              {email && <li><a href={`mailto:${email}`} className="flex items-center gap-2 break-all transition hover:text-white"><Icon name="mail" className="h-4 w-4 shrink-0 text-s-cyan" />{email}</a></li>}
              {address && <li className="flex gap-2"><Icon name="globe" className="mt-0.5 h-4 w-4 shrink-0 text-s-cyan" />{address}</li>}
              <li><Link href="/contact#book" className="flex items-center gap-2 transition hover:text-white"><Icon name="calendar" className="h-4 w-4 text-s-cyan" />Book a call</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="s-container flex flex-col items-start justify-between gap-3 py-6 text-xs sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} {SITE.legal}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy policy</Link>
            <Link href="/cookies" className="hover:text-white">Cookie policy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <button data-cookie-settings className="hover:text-white">Cookie settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
