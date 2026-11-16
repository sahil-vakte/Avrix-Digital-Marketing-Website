"use client";
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";

// Floating contact buttons (WhatsApp, call) plus back-to-top once the visitor scrolls.
export function WhatsAppButton({ number, phone = "" }: { number: string; phone?: string }) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const on = () => setUp(window.scrollY > 900);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const text = encodeURIComponent("Hi Avrix, I'd like to talk about growing my business.");
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-s-line bg-s-surface text-s-fg shadow-soft transition duration-300 hover:-translate-y-0.5 ${up ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, "")}`} aria-label="Call us" data-track="call"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#4f7cff] text-white shadow-glow transition hover:-translate-y-0.5">
          <Icon name="phone" className="h-5 w-5" />
        </a>
      )}
      {number && (
        <a href={`https://wa.me/${number}?text=${text}`} target="_blank" rel="noopener" data-track="whatsapp"
          className="group relative flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,.7)] transition hover:-translate-y-0.5">
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.6s]" />
          <Icon name="whatsapp" fill className="h-5 w-5" /> <span className="hidden sm:inline">WhatsApp us</span>
        </a>
      )}
    </div>
  );
}
