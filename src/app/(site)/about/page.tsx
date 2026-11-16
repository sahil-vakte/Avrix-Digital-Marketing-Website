import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/content/site";

export const metadata: Metadata = { title: "About us", description: "Avrix UK & Europe is the SME growth-marketing arm of Avrix Digital.", alternates: { canonical: "/about" } };

export default function About() {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="max-w-3xl">
        <p className="eyebrow">About</p>
        <h1 className="h-display mt-3 text-4xl sm:text-5xl">Growth marketing for SMEs across the UK and Europe</h1>
        <div className="prose-x mt-8">
          <p>{SITE.legal} is the SME-focused arm of <a href={SITE.parent.url}>{SITE.parent.name}</a>. We help small and medium-sized businesses turn marketing spend into measurable enquiries and sales.</p>
          <p>Instead of selling one-off services, we build joined-up systems: ads that bring the right people, websites that convert them, a CRM that keeps track of every enquiry, and automated follow-up so no lead goes cold.</p>
          <h2>What we believe</h2>
          <ul>
            <li><b>Measure what matters.</b> Enquiries, booked calls and revenue — not impressions.</li>
            <li><b>You own your marketing.</b> Accounts and data are set up in your name.</li>
            <li><b>Plain English.</b> Clear reports and honest advice, without jargon.</li>
            <li><b>Respect for inboxes.</b> We follow UK GDPR and PECR, and build compliance into every campaign.</li>
          </ul>
          <h2>Who we work with</h2>
          <p>Professional services, trades and home services, healthcare and clinics, B2B suppliers and e-commerce brands in the UK, Ireland and across the EU.</p>
        </div>
        <Link href="/contact" className="btn-primary mt-8">Start with a free review</Link>
      </div>
    </div>
  );
}
