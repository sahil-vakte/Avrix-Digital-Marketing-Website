"use client";
import { useEffect, useState } from "react";
import { useInView } from "./useInView";

// Animated example of instant follow-up: a new enquiry gets a reply in seconds.
const MSGS: { from: "lead" | "us"; text: string; time: string }[] = [
  { from: "lead", text: "Hi, I filled in your form — do you cover Manchester?", time: "09:41" },
  { from: "us", text: "Hi Sarah 👋 Yes, we do. Thanks for getting in touch!", time: "09:41" },
  { from: "us", text: "Here's our 2-page guide with prices and recent results.", time: "09:41" },
  { from: "lead", text: "Perfect. Can we talk tomorrow?", time: "09:43" },
  { from: "us", text: "Of course — pick any time that suits you here: avrix.link/book", time: "09:43" },
];

export function ChatMockup() {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(MSGS.length); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i > MSGS.length + 3) i = 1; // pause on the full thread, then replay
      setShown(Math.min(i, MSGS.length));
    }, 1300);
    setShown(1);
    return () => clearInterval(id);
  }, [inView]);

  const typing = inView && shown < MSGS.length && MSGS[shown]?.from === "us";
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm" aria-label="Example WhatsApp follow-up conversation" role="img">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-[#22c55e]/25 via-[#22d3ee]/15 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[28px] border border-s-line bg-s-surface shadow-glow">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">A</span>
          <span className="flex-1"><span className="block text-sm font-semibold">Avrix UK &amp; Europe</span><span className="block text-[11px] text-white/70">{typing ? "typing…" : "online"}</span></span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">Example</span>
        </div>
        <div className="flex min-h-[330px] flex-col gap-2 bg-[#efeae2] p-4 dark:bg-[#0b141a]">
          {MSGS.slice(0, shown).map((m, i) => (
            <div key={i} className={`max-w-[82%] animate-s-pop rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${m.from === "us" ? "self-end rounded-br-md bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-white" : "self-start rounded-bl-md bg-white text-[#111b21] dark:bg-[#202c33] dark:text-white"}`}>
              {m.text}<span className="ml-2 align-bottom text-[10px] opacity-60">{m.time}{m.from === "us" && " ✓✓"}</span>
            </div>
          ))}
          {typing && (
            <div className="flex gap-1 self-end rounded-2xl rounded-br-md bg-[#d9fdd3] px-3 py-3 dark:bg-[#005c4b]">
              {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-s-blink rounded-full bg-[#111b21]/60 dark:bg-white/70" style={{ animationDelay: `${d * 0.2}s` }} />)}
            </div>
          )}
        </div>
      </div>
      <div className="absolute -left-6 top-24 hidden animate-s-float rounded-xl border border-s-line bg-s-surface px-3 py-2 text-xs shadow-soft sm:block">
        <span className="block font-semibold text-s-fg">Replied in 12s</span><span className="text-s-muted">Automatic follow-up</span>
      </div>
      <div className="absolute -right-6 bottom-16 hidden animate-s-float-slow rounded-xl border border-s-line bg-s-surface px-3 py-2 text-xs shadow-soft sm:block">
        <span className="block font-semibold text-s-green">● Lead added to CRM</span><span className="text-s-muted">Stage: Contacted</span>
      </div>
    </div>
  );
}
