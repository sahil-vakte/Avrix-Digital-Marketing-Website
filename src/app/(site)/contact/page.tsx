import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { BookingWidget } from "@/components/site/BookingWidget";
import { getSetting } from "@/lib/settings";
import { env } from "@/lib/env";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact", description: "Get a free marketing review or book a call with Avrix UK & Europe.", alternates: { canonical: "/contact" } };

export default async function Contact({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const booking = await getSetting("booking");
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="max-w-2xl"><p className="eyebrow">Contact</p><h1 className="h-display mt-3 text-4xl sm:text-5xl">Let's talk about growth</h1>
        <p className="mt-4 text-ink-500">Send a message, book a call, or WhatsApp us — whichever is easiest.{plan ? ` You asked about the ${plan} plan.` : ""}</p></div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <aside className="space-y-4">
          {env.company.phone && <a href={`tel:${env.company.phone.replace(/\s/g, "")}`} className="card flex items-center gap-3 p-5"><Icon name="phone" className="text-brand-600" /><span><span className="block text-xs text-ink-500">Call us</span><span className="font-semibold">{env.company.phone}</span></span></a>}
          {env.company.whatsapp && <a href={`https://wa.me/${env.company.whatsapp}`} target="_blank" rel="noopener" className="card flex items-center gap-3 p-5"><Icon name="whatsapp" fill className="text-[#25D366]" /><span><span className="block text-xs text-ink-500">WhatsApp</span><span className="font-semibold">Message us</span></span></a>}
          {env.mail.replyTo && <a href={`mailto:${env.mail.replyTo}`} className="card flex items-center gap-3 p-5"><Icon name="mail" className="text-brand-600" /><span><span className="block text-xs text-ink-500">Email</span><span className="font-semibold">{env.mail.replyTo}</span></span></a>}
          {env.company.address && <div className="card p-5 text-sm text-ink-500">{env.company.address}</div>}
        </aside>
      </div>
      <section id="book" className="mt-20 scroll-mt-24">
        <h2 className="h-display text-3xl">Book a {booking.slotMinutes}-minute call</h2>
        <p className="mt-2 text-ink-500">Pick a time that suits you. All times are UK time.</p>
        <div className="mt-6 max-w-3xl"><BookingWidget days={booking.days} leadDays={booking.leadDays} /></div>
      </section>
    </div>
  );
}
