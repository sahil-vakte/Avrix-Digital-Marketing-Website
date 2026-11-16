import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { BookingWidget } from "@/components/site/BookingWidget";
import { PageHero } from "@/components/site/PageHero";
import { getSetting } from "@/lib/settings";
import { env } from "@/lib/env";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact", description: "Get a free marketing review or book a call with Avrix UK & Europe.", alternates: { canonical: "/contact" } };

export default async function Contact({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const booking = await getSetting("booking");
  const tile = "s-card s-card-hover flex items-center gap-4 p-5";
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Let's talk about <span className="s-gradient-text">growth</span></>}
        lead={<>Send a message, book a call, or WhatsApp us — whichever is easiest.{plan ? ` You asked about the ${plan} plan.` : ""}</>} />
      <section className="s-container grid gap-10 pb-20 lg:grid-cols-[1.4fr_1fr]">
        <div data-reveal><ContactForm /></div>
        <aside className="space-y-4" data-reveal="right">
          {env.company.phone && <a href={`tel:${env.company.phone.replace(/\s/g, "")}`} className={tile}><span className="s-icon-tile"><Icon name="phone" /></span><span><span className="block text-xs text-s-muted">Call us</span><span className="font-semibold">{env.company.phone}</span></span></a>}
          {env.company.whatsapp && <a href={`https://wa.me/${env.company.whatsapp}`} target="_blank" rel="noopener" className={tile}><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]"><Icon name="whatsapp" fill /></span><span><span className="block text-xs text-s-muted">WhatsApp</span><span className="font-semibold">Message us</span></span></a>}
          {env.mail.replyTo && <a href={`mailto:${env.mail.replyTo}`} className={tile}><span className="s-icon-tile"><Icon name="mail" /></span><span className="min-w-0"><span className="block text-xs text-s-muted">Email</span><span className="block truncate font-semibold">{env.mail.replyTo}</span></span></a>}
          {env.company.address && <div className="s-card flex gap-4 p-5 text-sm text-s-muted"><span className="s-icon-tile shrink-0"><Icon name="globe" /></span>{env.company.address}</div>}
          <div className="s-dark overflow-hidden rounded-2xl border border-white/10 bg-navy-900 p-6">
            <p className="s-eyebrow">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm text-white/90">
              {["We read your message and look at your current marketing", "You get a reply within one working day", "If it's a fit, we book a short review call"].map((x, i) => (
                <li key={x} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#22d3ee] text-xs font-bold text-white">{i + 1}</span>{x}</li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
      <section id="book" className="scroll-mt-24 bg-s-soft py-20">
        <div className="s-container grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div data-reveal>
            <p className="s-eyebrow"><span className="h-px w-6 bg-current" />Book a call</p>
            <h2 className="s-h2 mt-4">Book a {booking.slotMinutes}-minute call</h2>
            <p className="s-lead mt-4">Pick a time that suits you. All times are UK time.</p>
          </div>
          <div data-reveal><BookingWidget days={booking.days} leadDays={booking.leadDays} /></div>
        </div>
      </section>
    </>
  );
}
