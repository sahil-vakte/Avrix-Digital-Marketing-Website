import Link from "next/link";
import { asc, eq, and } from "drizzle-orm";
import { db, t } from "@/db";
import { PILLARS, SERVICES, STEPS, JOURNEY, TESTIMONIALS, SITE } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { ProblemTabs } from "@/components/site/ProblemTabs";
import { CapabilitiesGrid } from "@/components/site/CapabilitiesGrid";
import { PricingTable } from "@/components/site/PricingTable";
import { Faq, faqJsonLd } from "@/components/site/Faq";
import { ContactForm } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [plans, faqs] = await Promise.all([
    db.select().from(t.pricingPlans).where(eq(t.pricingPlans.active, true)).orderBy(asc(t.pricingPlans.order)),
    db.select().from(t.faqs).where(and(eq(t.faqs.active, true), eq(t.faqs.page, "home"))).orderBy(asc(t.faqs.order)),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="eyebrow">UK &amp; Europe · SME growth marketing</p>
            <h1 className="h-display mt-4 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              Marketing systems that turn <span className="text-brand-600">clicks into customers</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-500">
              We connect your ads, website, CRM and follow-up into one system — then show you exactly which pounds and euros bring in new business.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">Get a free marketing review <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/contact#book" className="btn-ghost"><Icon name="calendar" className="h-4 w-4" /> Book a 20-minute call</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              {["No long contracts", "You own every account", "Reports in revenue, not clicks"].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-green-600" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="card relative p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">This month · example dashboard</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[["Enquiries", "148", "+32%"], ["Cost / lead", "£24", "−18%"], ["Booked calls", "41", "+27%"]].map(([k, v, d]) => (
                <div key={k} className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-ink-500">{k}</p><p className="font-display text-2xl font-extrabold">{v}</p><p className="text-xs font-semibold text-green-600">{d}</p></div>
              ))}
            </div>
            <svg viewBox="0 0 300 90" className="mt-5 w-full" aria-hidden="true">
              <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3563f2" stopOpacity=".35" /><stop offset="1" stopColor="#3563f2" stopOpacity="0" /></linearGradient></defs>
              <path d="M0 70 L30 64 L60 66 L90 52 L120 55 L150 40 L180 44 L210 30 L240 33 L270 18 L300 12 L300 90 L0 90Z" fill="url(#g)" />
              <path d="M0 70 L30 64 L60 66 L90 52 L120 55 L150 40 L180 44 L210 30 L240 33 L270 18 L300 12" fill="none" stroke="#2347d6" strokeWidth="2.5" />
            </svg>
            <div className="mt-4 space-y-2">
              {[["Google Ads", 46], ["Meta Ads", 31], ["Organic search", 15], ["Email & WhatsApp", 8]].map(([k, v]) => (
                <div key={k as string} className="flex items-center gap-3 text-xs"><span className="w-28 text-ink-500">{k}</span><span className="h-2 flex-1 rounded-full bg-gray-100"><span className="block h-2 rounded-full bg-brand-500" style={{ width: `${v}%` }} /></span><span className="w-8 text-right font-semibold">{v}%</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="container-x py-20">
        <div className="max-w-2xl"><p className="eyebrow">One joined-up system</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Six parts, working together</h2>
          <p className="mt-4 text-ink-500">Most SMEs have ads, a website and an inbox that don't talk to each other. We connect them so nothing falls through the gaps.</p></div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="card p-6">
              <span className="font-display text-sm font-bold text-brand-600">0{i + 1}</span>
              <h3 className="mt-2 font-display text-xl font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-500">{p.text}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="badge bg-brand-50 text-brand-700">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem selector */}
      <section className="bg-gray-50 py-20">
        <div className="container-x">
          <div className="max-w-2xl"><p className="eyebrow">Sound familiar?</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Pick the problem you want solved</h2></div>
          <div className="mt-10"><ProblemTabs /></div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container-x scroll-mt-20 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl"><p className="eyebrow">Services</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Everything you need to grow, under one roof</h2></div>
          <Link href="/pricing" className="btn-ghost">See pricing</Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600"><Icon name={s.icon} className="h-6 w-6" /></span>
              <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-500">{s.short}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Learn more <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink-900 py-20 text-white">
        <div className="container-x">
          <p className="eyebrow text-accent-400">How we work</p><h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">From first review to steady growth</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 font-bold text-ink-900">{i + 1}</span>
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3><p className="mt-2 text-sm text-gray-300">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14">
            <h3 className="font-display text-xl font-bold">From click to recorded sale</h3>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {JOURNEY.map((j, i) => (
                <span key={j} className="flex items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">{j}</span>
                  {i < JOURNEY.length - 1 && <Icon name="arrow" className="h-4 w-4 text-accent-400" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="container-x py-20">
        <div className="max-w-2xl"><p className="eyebrow">Capabilities</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">The detail behind the results</h2></div>
        <div className="mt-8"><CapabilitiesGrid /></div>
      </section>

      {/* Testimonials */}
      <section className="bg-brand-50 py-20">
        <div className="container-x grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((x, i) => (
            <figure key={i} className="card p-8">
              <blockquote className="font-display text-xl font-semibold leading-snug">“{x.quote}”</blockquote>
              <figcaption className="mt-4 text-sm text-ink-500">{x.name} · {x.role}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-x py-20">
        <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Pricing</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Simple plans in pounds or euros</h2>
          <p className="mt-4 text-ink-500">Prices exclude VAT and ad spend. Every plan starts with a free review.</p></div>
        <div className="mt-10"><PricingTable plans={plans.map((p) => ({ ...p, priceGbp: String(p.priceGbp), priceEur: String(p.priceEur) }))} /></div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div><p className="eyebrow">FAQs</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Questions we often get</h2>
            <p className="mt-4 text-ink-500">Something else? <Link href="/contact" className="text-brand-600 underline">Ask us directly</Link>.</p></div>
          <Faq items={faqs} />
        </div>
        <JsonLd data={faqJsonLd(faqs)} />
      </section>

      {/* Contact */}
      <section id="contact" className="container-x py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow">Free review</p><h2 className="h-display mt-3 text-3xl sm:text-4xl">Tell us what you want to improve</h2>
            <ul className="mt-6 space-y-3 text-ink-700">
              {["A clear view of what's working in your marketing today", "The three changes most likely to grow enquiries", "Honest advice — even if that means you don't need us", "Reply within one working day"].map((x) => (
                <li key={x} className="flex gap-3"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />{x}</li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ink-500">{SITE.legal} is part of <a href={SITE.parent.url} className="underline">{SITE.parent.name}</a>.</p>
          </div>
          <ContactForm compact />
        </div>
      </section>
    </>
  );
}
