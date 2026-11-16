import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="16 November 2026">
      <p>These terms govern your use of this website, operated by {env.company.legalName}. Services are provided under a separate written agreement.</p>
      <h2>Use of this website</h2>
      <p>Content is provided for general information and may change without notice. You must not misuse the site, attempt to gain unauthorised access, or submit unlawful content through our forms.</p>
      <h2>Pricing</h2>
      <p>Prices shown exclude VAT and advertising spend and are indicative until confirmed in a written proposal.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law we are not liable for losses arising from use of this website. Nothing in these terms limits liability that cannot be limited by law.</p>
      <h2>Law</h2>
      <p>These terms are governed by the law of England and Wales, and the courts of England and Wales have exclusive jurisdiction.</p>
    </LegalPage>
  );
}
