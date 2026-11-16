import { Scene, type SceneKind } from "./art/Scene";

// Shared top section for inner pages: soft grid, glow, optional illustration.
export function PageHero({ eyebrow, title, lead, scene, children, center = false }: {
  eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; scene?: SceneKind; children?: React.ReactNode; center?: boolean;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="s-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563eb]/15 blur-3xl dark:bg-[#2563eb]/25" />
      <div className={`s-container relative grid items-center gap-10 py-16 lg:py-24 ${scene ? "lg:grid-cols-[1.2fr_1fr]" : ""}`}>
        <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
          <p className="s-eyebrow animate-s-pop">{eyebrow}</p>
          <h1 className="s-h1 mt-4 animate-s-pop [animation-delay:80ms]">{title}</h1>
          {lead && <p className="s-lead mt-5 animate-s-pop [animation-delay:160ms]">{lead}</p>}
          {children && <div className="mt-8 animate-s-pop [animation-delay:240ms]">{children}</div>}
        </div>
        {scene && (
          <div className="relative hidden animate-s-pop [animation-delay:200ms] lg:block">
            <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#2563eb]/25 to-[#a78bfa]/20 blur-2xl" />
            <Scene kind={scene} className="relative w-full rounded-3xl shadow-glow" />
          </div>
        )}
      </div>
    </section>
  );
}
