import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { CookieBanner } from "@/components/site/CookieBanner";
import { UtmCapture } from "@/components/site/UtmCapture";
import { JsonLd } from "@/components/site/JsonLd";
import { env } from "@/lib/env";
import { SITE } from "@/content/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer phone={env.company.phone} address={env.company.address} />
      <WhatsAppButton number={env.company.whatsapp} />
      <CookieBanner />
      <UtmCapture />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Organization", name: SITE.legal, url: env.appUrl,
        parentOrganization: { "@type": "Organization", name: SITE.parent.name, url: SITE.parent.url },
        telephone: env.company.phone || undefined, address: env.company.address || undefined,
        areaServed: ["GB", "IE", "EU"],
      }} />
    </>
  );
}
