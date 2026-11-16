import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SERVICES, SERVICE_SCENES } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/site/ContactForm";
import { Faq, faqJsonLd } from "@/components/site/Faq";
import { JsonLd } from "@/components/site/JsonLd";
import { Scene } from "@/components/site/art/Scene";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  return s ? { title: s.title, description: s.intro, alternates: { canonical: `/services/${s.slug}` } } : {};
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) notFound();
  const faqs = s.faqs.map((f, i) => ({ id: String(i), question: f.q, answer: f.a }));
  const others = SERVICES.filter((x) => x.slug !== s.slug).slice(0, 3);
  return (
    <>
      <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
        <div className="s-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[620px] rounded-full bg-[#2563eb]/15 blur-3xl dark:bg-[#2563eb]/25" />
        <div className="s-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm font-medium text-s-muted transition hover:text-s-primary">
              <Icon name="arrow" className="h-4 w-4 rotate-180" /> All services
            </Link>
            <span className="s-icon-tile mt-8 flex h-14 w-14 animate-s-pop"><Icon name={s.icon} className="h-7 w-7" /></span>
            <h1 className="s-h1 mt-5 animate-s-pop [animation-delay:80ms]">{s.title}</h1>
            <p className="s-lead mt-5 max-w-xl animate-s-pop [animation-delay:160ms]">{s.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3 animate-s-pop [animation-delay:240ms]">
              <Link href="#enquire" className="s-btn-primary">Get a free review <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/pricing" className="s-btn-ghost">View pricing</Link>
            </div>
          </div>
          <div className="relative animate-s-pop [animation-delay:200ms]">
            <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#2563eb]/25 to-[#a78bfa]/20 blur-2xl" />
            <Scene kind={SERVICE_SCENES[s.slug] ?? "chart"} className="relative w-full rounded-3xl shadow-glow" label={`Illustration for ${s.title}`} />
          </div>
        </div>
      </section>

      <section className="s-container grid gap-5 pb-8 md:grid-cols-3">
        {s.outcomes.map((o, i) => (
          <div key={o} className="s-card s-card-hover flex items-start gap-4 p-6" data-reveal data-reveal-delay={String(i * 90)}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-s-green/15 text-s-green"><Icon name="check" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-s-muted">Outcome 0{i + 1}</p><p className="mt-1 font-semibold">{o}</p></div>
          </div>
        ))}
      </section>

      <section className="s-container py-16 lg:py-24">
        <div className="s-dark relative overflow-hidden rounded-[32px] border border-white/10 bg-navy-900 p-6 sm:p-10 lg:p-14" data-reveal="zoom">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#2563eb]/30 blur-3xl" />
          <p className="s-eyebrow relative"><span className="h-px w-6 bg-current" />Our process</p>
          <h2 className="s-h2 relative mt-4 text-white">{s.title}, step by step</h2>
          <ol className={`relative mt-10 grid gap-5 sm:grid-cols-2 ${s.process.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            {s.process.map((p, i) => (
              <li key={p.title} className="s-glass p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30" data-reveal data-reveal-delay={String(i * 100)}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#22d3ee] font-display text-sm font-bold text-white shadow-glow">0{i + 1}</span>
                <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-s-muted">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="s-container grid gap-12 pb-20 lg:grid-cols-2">
        <div data-reveal="left">
          <p className="s-eyebrow"><span className="h-px w-6 bg-current" />Deliverables</p>
          <h2 className="s-h2 mt-4">What's included</h2>
          <ul className="mt-8 grid gap-3">
            {s.deliverables.map((d) => (
              <li key={d} className="flex items-center gap-3 rounded-xl border border-s-line bg-s-surface px-4 py-3.5 shadow-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-s-primary/10 text-s-primary"><Icon name="check" className="h-4 w-4" /></span>{d}
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal="right">
          <p className="s-eyebrow"><span className="h-px w-6 bg-current" />FAQs</p>
          <h2 className="s-h2 mt-4">Common questions</h2>
          <div className="mt-8"><Faq items={faqs} /></div>
        </div>
      </section>

      <section id="enquire" className="scroll-mt-24 bg-s-soft py-20">
        <div className="s-container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div data-reveal>
            <p className="s-eyebrow"><span className="h-px w-6 bg-current" />Free review</p>
            <h2 className="s-h2 mt-4">Talk to us about {s.title}</h2>
            <p className="s-lead mt-4">Tell us where you are today and we'll come back within one working day with honest next steps.</p>
          </div>
          <div data-reveal><ContactForm defaultService={s.title} /></div>
        </div>
      </section>

      <section className="s-container py-20">
        <h2 className="font-display text-2xl font-bold" data-reveal>Related services</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {others.map((o, i) => (
            <Link key={o.slug} href={`/services/${o.slug}`} className="s-card s-card-hover group flex items-center gap-4 p-5" data-reveal data-reveal-delay={String(i * 90)}>
              <span className="s-icon-tile shrink-0"><Icon name={o.icon} /></span>
              <span className="flex-1"><span className="block font-semibold">{o.title}</span><span className="mt-0.5 block text-xs text-s-muted">{o.short}</span></span>
              <Icon name="arrow" className="h-4 w-4 shrink-0 text-s-primary transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: s.title, description: s.intro, provider: { "@type": "Organization", name: "Avrix UK & Europe Business Marketing" }, areaServed: ["GB", "EU"] }} />
      <JsonLd data={faqJsonLd(faqs)} />
    </>
  );
}
