import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/content/site";

const base = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: "website", siteName: SITE.name, locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/", languages: { "en-GB": "/" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
