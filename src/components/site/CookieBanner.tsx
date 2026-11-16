"use client";
// UK GDPR / PECR consent banner. Analytics & marketing tags load only after opt-in.
import { useEffect, useState } from "react";
import Link from "next/link";

type Consent = { analytics: boolean; marketing: boolean; at: string };
const KEY = "avrix_consent_v1";

function read(): Consent | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

function loadTags(c: Consent) {
  const w = window as unknown as Record<string, unknown> & { dataLayer?: unknown[] };
  const ga = process.env.NEXT_PUBLIC_GA_ID, gtm = process.env.NEXT_PUBLIC_GTM_ID, px = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const add = (src: string) => { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); };
  if (c.analytics && ga && !w.__gaLoaded) {
    w.__gaLoaded = true;
    add(`https://www.googletagmanager.com/gtag/js?id=${ga}`);
    w.dataLayer = w.dataLayer || [];
    const gtag = (...args: unknown[]) => { w.dataLayer!.push(args); };
    (w as Record<string, unknown>).gtag = gtag;
    gtag("js", new Date()); gtag("config", ga, { anonymize_ip: true });
  }
  if ((c.analytics || c.marketing) && gtm && !w.__gtmLoaded) {
    w.__gtmLoaded = true;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    add(`https://www.googletagmanager.com/gtm.js?id=${gtm}`);
  }
  if (c.marketing && px && !w.__fbqLoaded) {
    w.__fbqLoaded = true;
    const s = document.createElement("script");
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`;
    document.head.appendChild(s);
  }
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = read();
    if (c) loadTags(c); else setShow(true);
    const open = (e: Event) => { if ((e.target as HTMLElement).closest("[data-cookie-settings]")) { setShow(true); setCustom(true); } };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);

  const save = (c: Omit<Consent, "at">) => {
    const v = { ...c, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
    loadTags(v); setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-s-line bg-s-surface p-5 shadow-glow backdrop-blur">
      <p className="text-sm text-s-fg/80">
        We use essential cookies to run this site. With your permission we also use analytics and marketing cookies to understand visits and measure our ads.{" "}
        <Link href="/cookies" className="text-s-primary underline">Cookie policy</Link>
      </p>
      {custom && (
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Essential (always on)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Analytics (Google Analytics)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Marketing (Meta Pixel, ad measurement)</label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="s-btn-primary s-btn-sm" onClick={() => save({ analytics: true, marketing: true })}>Accept all</button>
        <button className="s-btn-ghost s-btn-sm" onClick={() => save({ analytics: false, marketing: false })}>Reject non-essential</button>
        {custom
          ? <button className="s-btn-ghost s-btn-sm" onClick={() => save({ analytics, marketing })}>Save choices</button>
          : <button className="s-btn-ghost s-btn-sm" onClick={() => setCustom(true)}>Customise</button>}
      </div>
    </div>
  );
}
