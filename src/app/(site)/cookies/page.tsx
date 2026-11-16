import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cookie policy", alternates: { canonical: "/cookies" } };

export default function Cookies() {
  return (
    <LegalPage title="Cookie policy" updated="16 November 2026">
      <p>We use a small number of cookies and similar technologies. Non-essential cookies are only set after you agree via the banner. You can change your choice at any time using “Cookie settings” in the footer.</p>
      <h2>Essential</h2>
      <ul><li><b>avrix_consent_v1</b> (local storage) — remembers your cookie choice.</li><li><b>avrix_utm</b> (session storage) — remembers which page or advert brought you here so your enquiry reaches the right person. Cleared when you close the tab.</li></ul>
      <h2>Analytics (optional)</h2>
      <ul><li><b>Google Analytics 4</b> (_ga, _ga_*) — anonymous visit statistics, up to 13 months.</li></ul>
      <h2>Marketing (optional)</h2>
      <ul><li><b>Meta Pixel</b> (_fbp) — measures the results of our Facebook and Instagram adverts, up to 90 days.</li></ul>
      <h2>Email tracking</h2>
      <p>Our marketing emails contain a small image and tracked links that tell us whether an email was opened or clicked. You can block this by turning off images in your email client, and you can unsubscribe from every email.</p>
    </LegalPage>
  );
}
