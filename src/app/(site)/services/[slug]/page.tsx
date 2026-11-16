import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SERVICES } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/site/ContactForm";
import { Faq, faqJsonLd } from "@/components/site/Faq";
import { JsonLd } from "@/components/site/JsonLd";

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
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-x py-16 lg:py-24">
          <Link href="/#services" className="text-sm text-brand-600">← All services</Link>
          <div className="mt-6 flex items-start gap-4">
            <span className="hidden rounded-2xl bg-white p-4 text-brand-600 shadow-card sm:inline-flex"><Icon name={s.icon} className="h-8 w-8" /></span>
            <div className="max-w-3xl">
              <h1 className="h-display text-4xl sm:text-5xl">{s.title}</h1>
              <p className="mt-5 text-lg text-ink-500">{s.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href="#enquire" className="btn-primary">Get a free review</Link><Link href="/pricing" className="btn-ghost">View pricing</Link></div>
            </div>
          </div>
        </div>
      </section>
      <section className="container-x grid gap-6 py-12 md:grid-cols-3">
        {s.outcomes.map((o) => (
          <div key={o} className="card flex items-start gap-3 p-6"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /><p className="font-semibold">{o}</p></div>
        ))}
      </section>
      <section className="container-x py-12">
        <h2 className="h-display text-3xl">Our process</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {s.process.map((p, i) => (
            <li key={p.title} className="card p-6"><span className="font-display text-sm font-bold text-brand-600">Step {i + 1}</span>
              <h3 className="mt-1 font-display text-lg font-bold">{p.title}</h3><p className="mt-2 text-sm text-ink-500">{p.text}</p></li>
          ))}
        </ol>
      </section>
      <section className="container-x grid gap-10 py-12 lg:grid-cols-2">
        <div>
          <h2 className="h-display text-3xl">What's included</h2>
          <ul className="mt-6 space-y-3">{s.deliverables.map((d) => <li key={d} className="flex gap-3"><Icon name="check" className="mt-0.5 h-5 w-5 text-brand-600" />{d}</li>)}</ul>
        </div>
        <div><h2 className="h-display text-3xl">FAQs</h2><div className="mt-6"><Faq items={faqs} /></div></div>
      </section>
      <section id="enquire" className="scroll-mt-20 bg-gray-50 py-16">
        <div className="container-x max-w-3xl"><h2 className="h-display text-3xl">Talk to us about {s.title.toLowerCase()}</h2><div className="mt-6"><ContactForm defaultService={s.title} /></div></div>
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", name: s.title, description: s.intro, provider: { "@type": "Organization", name: "Avrix UK & Europe Business Marketing" }, areaServed: ["GB", "EU"] }} />
      <JsonLd data={faqJsonLd(faqs)} />
    </>
  );
}
