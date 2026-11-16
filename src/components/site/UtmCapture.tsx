"use client";
// Stores first-touch UTM parameters, referrer and landing page for the lead forms.
import { useEffect } from "react";

export const UTM_KEY = "avrix_utm";
export function UtmCapture() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(UTM_KEY)) return;
      const p = new URLSearchParams(location.search);
      const data: Record<string, string> = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]) {
        const v = p.get(k); if (v) data[k] = v.slice(0, 200);
      }
      data.landing_page = location.pathname;
      if (document.referrer && !document.referrer.startsWith(location.origin)) data.referrer = document.referrer.slice(0, 300);
      sessionStorage.setItem(UTM_KEY, JSON.stringify(data));
    } catch {}
  }, []);
  return null;
}

export function readUtm(): Record<string, string> {
  try { return JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}"); } catch { return {}; }
}
