import { GeistSans } from "geist/font/sans";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { CookieBanner } from "@/components/site/CookieBanner";
import { UtmCapture } from "@/components/site/UtmCapture";
import { JsonLd } from "@/components/site/JsonLd";
import { ThemeScript } from "@/components/site/ThemeScript";
import { RevealObserver } from "@/components/site/Reveal";
import { env } from "@/lib/env";
import { SITE } from "@/content/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site-root ${GeistSans.variable}`}>
      <ThemeScript />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-s-surface focus:p-2 focus:text-s-fg">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer phone={env.company.phone} address={env.company.address} email={env.mail.replyTo} />
      <WhatsAppButton number={env.company.whatsapp} phone={env.company.phone} />
      <CookieBanner />
      <UtmCapture />
      <RevealObserver />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Organization", name: SITE.legal, url: env.appUrl,
        parentOrganization: { "@type": "Organization", name: SITE.parent.name, url: SITE.parent.url },
        telephone: env.company.phone || undefined, address: env.company.address || undefined,
        areaServed: ["GB", "IE", "EU"],
      }} />
    </div>
  );
}
