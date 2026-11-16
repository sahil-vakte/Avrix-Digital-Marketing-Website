import Link from "next/link";
import { asc, eq, and } from "drizzle-orm";
import { db, t } from "@/db";
import { PILLARS, SERVICES, STEPS, JOURNEY, TESTIMONIALS, SITE, CAPABILITIES, CHANNELS, PILLAR_SCENES, SERVICE_SCENES } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { ProblemTabs } from "@/components/site/ProblemTabs";
import { CapabilitiesGrid } from "@/components/site/CapabilitiesGrid";
import { PricingTable } from "@/components/site/PricingTable";
import { Faq, faqJsonLd } from "@/components/site/Faq";
import { ContactForm } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/site/JsonLd";
import { Counter } from "@/components/site/Counter";
import { HeroOrbit } from "@/components/site/art/HeroOrbit";
import { Scene } from "@/components/site/art/Scene";
import { ChatMockup } from "@/components/site/art/ChatMockup";
import { DashboardMock } from "@/components/site/art/DashboardMock";

export const dynamic = "force-dynamic";

function Heading({ eyebrow, title, lead, center = false, light = false }: { eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} data-reveal>
      <p className={`s-eyebrow ${center ? "justify-center" : ""}`}><span className="h-px w-6 bg-current" />{eyebrow}</p>
      <h2 className={`s-h2 mt-4 ${light ? "text-white" : ""}`}>{title}</h2>
      {lead && <p className="s-lead mt-4">{lead}</p>}
    </div>
  );
}

export default async function Home() {
  const [plans, faqs] = await Promise.all([
    db.select().from(t.pricingPlans).where(eq(t.pricingPlans.active, true)).orderBy(asc(t.pricingPlans.order)),
    db.select().from(t.faqs).where(and(eq(t.faqs.active, true), eq(t.faqs.page, "home"))).orderBy(asc(t.faqs.order)),
  ]);
  const capCount = CAPABILITIES.reduce((n, c) => n + c.items.length, 0);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
        <div className="s-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] animate-s-float-slow rounded-full bg-[#2563eb]/20 blur-3xl dark:bg-[#2563eb]/30" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] animate-s-float rounded-full bg-[#a78bfa]/20 blur-3xl" />
        <div className="s-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="s-pill animate-s-pop"><span className="h-2 w-2 animate-s-blink rounded-full bg-s-green" />UK &amp; Europe · SME growth marketing</p>
            <h1 className="s-h1 mt-6 animate-s-pop [animation-delay:80ms]">
              Marketing systems that turn <span className="s-gradient-text">clicks into customers</span>.
            </h1>
            <p className="s-lead mt-6 max-w-xl animate-s-pop [animation-delay:160ms]">
              We connect your ads, website, CRM and follow-up into one system — then show you exactly which pounds and euros bring in new business.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-s-pop [animation-delay:240ms]">
              <Link href="/contact" className="s-btn-primary">Get a free marketing review <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/contact#book" className="s-btn-ghost"><Icon name="calendar" className="h-4 w-4" /> Book a 20-minute call</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-s-muted animate-s-pop [animation-delay:320ms]">
              {["No long contracts", "You own every account", "Reports in revenue, not clicks"].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-s-green" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="animate-s-pop [animation-delay:200ms]"><HeroOrbit /></div>
        </div>

        {/* Channels marquee */}
        <div className="relative border-y border-s-line bg-s-soft/60 py-5">
          <p className="sr-only">Platforms we work with</p>
          <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-s-marquee gap-10 hover:[animation-play-state:paused]">
              {[...CHANNELS, ...CHANNELS].map((c, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-s-muted" aria-hidden={i >= CHANNELS.length}>
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#22d3ee]" />{c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Pillars ───────── */}
      <section className="s-section">
        <div className="s-container">
          <Heading eyebrow="One joined-up system" title={<>Six parts, <span className="s-gradient-text">working together</span></>}
            lead="Most SMEs have ads, a website and an inbox that don't talk to each other. We connect them so nothing falls through the gaps." />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="s-card s-card-hover group overflow-hidden p-3" data-reveal data-reveal-delay={String((i % 3) * 100)}>
                <div className="overflow-hidden rounded-xl"><Scene kind={PILLAR_SCENES[i]} className="w-full transition duration-500 group-hover:scale-[1.04]" /></div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-s-primary">0{i + 1}</span>
                    <h3 className="font-display text-xl font-bold uppercase tracking-wide">{p.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-s-muted">{p.text}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">{p.tags.map((tg) => <span key={tg} className="rounded-full border border-s-line bg-s-soft px-2.5 py-1 text-[11px] font-semibold text-s-muted">{tg}</span>)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Problem selector (always-dark panel) ───────── */}
      <section className="s-container">
        <div className="s-dark relative overflow-hidden rounded-[32px] border border-white/10 bg-navy-900 px-5 py-14 sm:px-10 lg:px-14 lg:py-20" data-reveal="zoom">
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#2563eb]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-[#a78bfa]/20 blur-3xl" />
          <div className="s-grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative">
            <Heading eyebrow="Business problems we solve" light title="What do you need help with?" lead="Choose the situation that sounds familiar and see how we fix it." />
            <div className="mt-12"><ProblemTabs /></div>
          </div>
        </div>
      </section>

      {/* ───────── Stats ───────── */}
      <section className="s-container py-16">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { n: SERVICES.length, s: "", l: "Core services, one team" },
            { n: capCount, s: "+", l: "Capabilities we set up" },
            { n: 2, s: "", l: "Currencies — GBP & EUR" },
            { n: 1, s: " day", l: "Reply to every enquiry" },
          ].map((x, i) => (
            <div key={x.l} className="s-card relative overflow-hidden p-6" data-reveal data-reveal-delay={String(i * 90)}>
              <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-[#2563eb]/20 to-[#22d3ee]/10 blur-xl" />
              <p className="font-display text-4xl font-bold sm:text-5xl"><span className="s-gradient-text"><Counter to={x.n} suffix={x.s} /></span></p>
              <p className="mt-2 text-sm text-s-muted">{x.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Services ───────── */}
      <section id="services" className="scroll-mt-24 pb-20 lg:pb-28">
        <div className="s-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Heading eyebrow="Services" title="Everything you need to grow, under one roof" />
            <Link href="/pricing" className="s-btn-ghost" data-reveal>See pricing <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="s-card s-card-hover group flex flex-col overflow-hidden" data-reveal data-reveal-delay={String((i % 3) * 100)}>
                <div className="relative overflow-hidden">
                  <Scene kind={SERVICE_SCENES[s.slug] ?? "chart"} className="w-full transition duration-500 group-hover:scale-[1.05]" />
                  <span className="absolute left-4 top-4 s-icon-tile bg-white/90 text-[#2563eb] ring-0 backdrop-blur"><Icon name={s.icon} /></span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-s-muted">{s.short}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-s-primary">Learn more <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="s-dark relative overflow-hidden bg-navy-950 py-20 lg:py-28">
        <div className="s-grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[900px] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-3xl" />
        <div className="s-container relative">
          <Heading eyebrow="How we work" light center title="From first review to steady growth" lead="A clear four-step process — and you can take it in-house at any point." />
          <ol className="relative mt-16 grid gap-6 md:grid-cols-4">
            <span className="pointer-events-none absolute left-[12%] right-[12%] top-7 hidden h-px md:block">
              <svg className="h-2 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden="true">
                <line x1="0" y1="1" x2="100" y2="1" stroke="#22d3ee" strokeOpacity=".5" strokeWidth=".4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" className="animate-s-dash" />
              </svg>
            </span>
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center" data-reveal data-reveal-delay={String(i * 120)}>
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#22d3ee] font-display text-lg font-bold text-white shadow-glow">
                  <span className="absolute inset-0 animate-s-pulse rounded-2xl ring-2 ring-cyan-300/40" />0{i + 1}
                </span>
                <div className="s-glass mt-6 p-6">
                  <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-s-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Click to sale ───────── */}
      <section className="s-section">
        <div className="s-container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Heading eyebrow="Tracking & reporting" title="See which enquiries turn into sales" lead="Every click, form, call and WhatsApp message is tracked through your CRM — so your reports show revenue, not vanity metrics." />
            <ol className="mt-8 space-y-3">
              {JOURNEY.map((j, i) => (
                <li key={j} className="flex items-center gap-4" data-reveal="left" data-reveal-delay={String(i * 80)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-s-line bg-s-surface font-display text-sm font-bold text-s-primary shadow-soft">{i + 1}</span>
                  <span className="flex-1 rounded-xl border border-s-line bg-s-surface px-4 py-3 text-sm font-medium shadow-soft">{j}</span>
                  {i === JOURNEY.length - 1 && <span className="rounded-full bg-s-green/15 px-2.5 py-1 text-[11px] font-bold text-s-green">£ recorded</span>}
                </li>
              ))}
            </ol>
          </div>
          <div data-reveal="right"><DashboardMock /></div>
        </div>
      </section>

      {/* ───────── Instant follow-up ───────── */}
      <section className="relative overflow-hidden bg-s-soft py-20 lg:py-28">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#22c55e]/15 blur-3xl" />
        <div className="s-container relative grid items-center gap-14 lg:grid-cols-2">
          <div className="order-2 lg:order-1" data-reveal="left"><ChatMockup /></div>
          <div className="order-1 lg:order-2">
            <Heading eyebrow="Email & WhatsApp automation" title="Reply to every new enquiry in seconds, not days" lead="Leads hear from you straight away — with your brochure, prices or a booking link — and your team gets the conversation in the CRM." />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[["message", "Instant replies", "Sent the moment a form, ad lead or chat comes in."], ["calendar", "Booking links", "Prospects pick a time without the back-and-forth."], ["users", "Shared inbox", "Every reply is logged against the lead."], ["shield", "Compliant by design", "Consent, unsubscribe and suppression built in."]].map(([ic, h, d], i) => (
                <li key={h} className="s-card p-5" data-reveal data-reveal-delay={String(i * 90)}>
                  <span className="s-icon-tile"><Icon name={ic} /></span>
                  <h3 className="mt-3 font-semibold">{h}</h3><p className="mt-1 text-sm text-s-muted">{d}</p>
                </li>
              ))}
            </ul>
            <Link href="/services/email-whatsapp-automation" className="s-btn-primary mt-8" data-reveal>Explore automation <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* ───────── Capabilities ───────── */}
      <section className="s-section">
        <div className="s-container">
          <Heading eyebrow="Explore our capabilities" title={<><span className="s-gradient-text">{capCount}+ capabilities.</span> One connected growth system.</>}
            lead="From ads and websites to tracking, CRM and follow-up — the detail behind the results." />
          <div className="mt-10" data-reveal><CapabilitiesGrid /></div>
        </div>
      </section>

      {/* ───────── Testimonials ───────── */}
      <section className="s-container">
        <div className="grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((x, i) => (
            <figure key={i} className="s-dark relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy-900 to-navy-800 p-8 sm:p-10" data-reveal data-reveal-delay={String(i * 120)}>
              <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#2563eb]/30 blur-2xl" />
              <svg viewBox="0 0 32 32" className="h-10 w-10 text-s-cyan" fill="currentColor" aria-hidden="true"><path d="M9 7C5 9 3 13 3 18v7h9v-9H7c0-4 2-6 4-7zm16 0c-4 2-6 6-6 11v7h9v-9h-5c0-4 2-6 4-7z" /></svg>
              <blockquote className="relative mt-4 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">“{x.quote}”</blockquote>
              <figcaption className="relative mt-6 flex items-center gap-3 text-sm text-s-muted">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#22d3ee] font-bold text-white">{x.name.charAt(0)}</span>
                <span><span className="block font-semibold text-white">{x.name}</span>{x.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section id="pricing" className="s-section scroll-mt-24">
        <div className="s-container">
          <Heading center eyebrow="Pricing" title="Simple plans in pounds or euros" lead="Prices exclude VAT and ad spend. Every plan starts with a free review." />
          <div className="mt-12"><PricingTable plans={plans.map((p) => ({ ...p, priceGbp: String(p.priceGbp), priceEur: String(p.priceEur) }))} /></div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="bg-s-soft py-20 lg:py-28">
        <div className="s-container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Heading eyebrow="FAQs" title="Questions we often get" lead={<>Something else? <Link href="/contact" className="font-semibold text-s-primary underline underline-offset-4">Ask us directly</Link>.</>} />
            <div className="mt-8 hidden lg:block" data-reveal><Scene kind="chat" className="w-full max-w-sm rounded-3xl shadow-glow" /></div>
          </div>
          <div data-reveal><Faq items={faqs} /></div>
        </div>
        <JsonLd data={faqJsonLd(faqs)} />
      </section>

      {/* ───────── Contact ───────── */}
      <section id="contact" className="s-section scroll-mt-24">
        <div className="s-container grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Heading eyebrow="Free review" title="Tell us what you want to improve" />
            <ul className="mt-8 space-y-4">
              {["A clear view of what's working in your marketing today", "The three changes most likely to grow enquiries", "Honest advice — even if that means you don't need us", "Reply within one working day"].map((x, i) => (
                <li key={x} className="flex gap-3 text-s-fg/90" data-reveal="left" data-reveal-delay={String(i * 80)}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s-green/15 text-s-green"><Icon name="check" className="h-3.5 w-3.5" /></span>{x}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-s-muted">{SITE.legal} is part of <a href={SITE.parent.url} className="underline underline-offset-2">{SITE.parent.name}</a>.</p>
          </div>
          <div className="relative" data-reveal="right">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#2563eb]/15 via-transparent to-[#a78bfa]/15 blur-2xl" />
            <div className="relative"><ContactForm compact /></div>
          </div>
        </div>
      </section>
    </>
  );
}
