import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="16 November 2026">
      <p>{env.company.legalName} (“we”, “us”) is the controller of the personal data described in this policy. Address: {env.company.address || "[registered address]"}. Company number: [number]. ICO registration: [number]. Contact: {env.mail.replyTo || "[email]"}.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Enquiries and bookings:</b> name, business name, email, phone, country, message and the page or advert that brought you to us.</li>
        <li><b>Business contact data:</b> work contact details of people at organisations we believe may benefit from our services, obtained from public business sources or directly from you.</li>
        <li><b>Email engagement:</b> whether our emails were delivered, opened or clicked, and replies you send.</li>
        <li><b>Website usage:</b> with your consent, analytics and advertising cookies (see our cookie policy).</li>
      </ul>
      <h2>Why we use it and our lawful basis</h2>
      <ul>
        <li>To respond to enquiries and provide services — <i>steps prior to a contract / contract</i>.</li>
        <li>To send B2B marketing to corporate email addresses — <i>legitimate interests</i>, with an unsubscribe link in every email.</li>
        <li>To send marketing to individuals, sole traders and partnerships — <i>consent</i>.</li>
        <li>To measure and improve our website and campaigns — <i>consent</i> (cookies) and <i>legitimate interests</i> (email statistics).</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>Enquiry and client records: 6 years after our last interaction. Marketing contacts with no engagement: reviewed after 24 months and deleted. Unsubscribe and bounce records are kept indefinitely in a minimal suppression list so that we never contact you again.</p>
      <h2>Who we share it with</h2>
      <p>Our email provider (Google Workspace), our hosting provider, and professional advisers. We do not sell personal data. Where data is transferred outside the UK/EEA we use appropriate safeguards such as the UK IDTA or EU Standard Contractual Clauses.</p>
      <h2>Your rights</h2>
      <p>You can ask for access to, correction or deletion of your data, object to marketing at any time, restrict processing, and request portability. Email {env.mail.replyTo || "[email]"}. You can also complain to the Information Commissioner's Office (ico.org.uk) or your local EU supervisory authority.</p>
    </LegalPage>
  );
}
