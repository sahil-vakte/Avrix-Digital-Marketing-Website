import Link from "next/link";
import { Logo } from "./Logo";
import { SERVICES, SITE } from "@/content/site";

export function Footer({ phone, address }: { phone: string; address: string }) {
  return (
    <footer className="bg-ink-900 text-gray-300">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 text-sm text-gray-400">{SITE.description}</p>
          <p className="mt-4 text-xs text-gray-500">
            Part of <a href={SITE.parent.url} className="underline hover:text-white">{SITE.parent.name}</a>.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Services</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {SERVICES.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`} className="hover:text-white">{s.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/case-studies" className="hover:text-white">Case studies</Link></li>
            <li><Link href="/blog" className="hover:text-white">Insights</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Get in touch</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {phone && <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-white">{phone}</a></li>}
            {address && <li className="text-gray-400">{address}</li>}
            <li><Link href="/contact#book" className="hover:text-white">Book a call</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-6 text-xs text-gray-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} {SITE.legal}. All rights reserved.</p>
          <div className="flex gap-4">
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
