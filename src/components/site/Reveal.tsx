"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// One observer for the whole public site: any element with data-reveal fades/slides in
// when it scrolls into view. Optional data-reveal-delay="120" staggers items.
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add("site-reveal-live");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((e) => {
      const d = e.dataset.revealDelay;
      if (d) e.style.setProperty("--reveal-delay", `${d}ms`);
      io.observe(e);
    });
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
