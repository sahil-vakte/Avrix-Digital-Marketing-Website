import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { PageHero } from "@/components/site/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Scene } from "@/components/site/art/Scene";

export const metadata: Metadata = { title: "About us", description: "Avrix UK & Europe is the SME growth-marketing arm of Avrix Digital.", alternates: { canonical: "/about" } };

const VALUES = [
  { icon: "chart", t: "Measure what matters", d: "Enquiries, booked calls and revenue — not impressions." },
  { icon: "shield", t: "You own your marketing", d: "Accounts and data are set up in your name." },
  { icon: "message", t: "Plain English", d: "Clear reports and honest advice, without jargon." },
  { icon: "mail", t: "Respect for inboxes", d: "We follow UK GDPR and PECR, and build compliance into every campaign." },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About" scene="cycle" title={<>Growth marketing for SMEs across the <span className="s-gradient-text">UK and Europe</span></>}
        lead={<>{SITE.legal} is the SME-focused arm of <a href={SITE.parent.url} className="font-semibold text-s-primary underline underline-offset-4">{SITE.parent.name}</a>. We help small and medium-sized businesses turn marketing spend into measurable enquiries and sales.</>}>
        <Link href="/contact" className="s-btn-primary">Start with a free review <Icon name="arrow" className="h-4 w-4" /></Link>
      </PageHero>

      <section className="s-container grid items-center gap-12 pb-20 lg:grid-cols-2">
        <div data-reveal="left">
          <p className="s-eyebrow"><span className="h-px w-6 bg-current" />Our approach</p>
          <h2 className="s-h2 mt-4">Joined-up systems, not one-off services</h2>
          <p className="s-lead mt-5">Ads that bring the right people, websites that convert them, a CRM that keeps track of every enquiry, and automated follow-up so no lead goes cold.</p>
        </div>
        <div className="grid grid-cols-2 gap-4" data-reveal="right">
          {(["target", "browser", "pipeline", "chat"] as const).map((k, i) => (
            <Scene key={k} kind={k} className={`w-full rounded-2xl shadow-soft ${i % 2 ? "translate-y-6" : ""}`} />
          ))}
        </div>
      </section>

      <section className="s-container pb-20">
        <div className="s-dark relative overflow-hidden rounded-[32px] border border-white/10 bg-navy-900 p-6 sm:p-10 lg:p-14" data-reveal="zoom">
          <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#2563eb]/30 blur-3xl" />
          <p className="s-eyebrow relative"><span className="h-px w-6 bg-current" />What we believe</p>
          <h2 className="s-h2 relative mt-4 text-white">Four principles behind every project</h2>
          <div className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <div key={v.t} className="s-glass p-6" data-reveal data-reveal-delay={String(i * 100)}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#22d3ee] text-white shadow-glow"><Icon name={v.icon} /></span>
                <h3 className="mt-4 font-display text-lg font-bold text-white">{v.t}</h3>
                <p className="mt-2 text-sm leading-6 text-s-muted">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-container pb-24">
        <div className="s-card grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr]" data-reveal>
          <div>
            <p className="s-eyebrow"><span className="h-px w-6 bg-current" />Who we work with</p>
            <p className="mt-4 font-display text-2xl font-bold leading-snug">Professional services, trades and home services, healthcare and clinics, B2B suppliers and e-commerce brands in the UK, Ireland and across the EU.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {["Professional services", "Trades & home services", "Healthcare & clinics", "B2B suppliers", "E-commerce", "UK", "Ireland", "EU"].map((x) => (
              <span key={x} className="rounded-full border border-s-line bg-s-soft px-3 py-1.5 text-sm font-medium text-s-muted">{x}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
