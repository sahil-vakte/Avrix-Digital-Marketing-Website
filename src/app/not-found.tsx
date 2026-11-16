import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { ThemeScript } from "@/components/site/ThemeScript";
import { Scene } from "@/components/site/art/Scene";

export default function NotFound() {
  return (
    <div className={`site-root ${GeistSans.variable}`}>
      <ThemeScript />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-8 text-center">
        <div className="s-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-[#2563eb]/20 blur-3xl" />
        <Scene kind="rocket" className="relative w-full max-w-sm rounded-3xl shadow-glow" />
        <h1 className="relative mt-10 font-display text-6xl font-bold"><span className="s-gradient-text">404</span></h1>
        <p className="relative mt-3 text-s-muted">That page could not be found.</p>
        <Link href="/" className="s-btn-primary relative mt-8">Back to home</Link>
      </div>
    </div>
  );
}
