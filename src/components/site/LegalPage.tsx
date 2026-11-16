import { PageHero } from "./PageHero";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} lead={`Last updated: ${updated}`} />
      <div className="s-container max-w-3xl pb-20">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-s-amber">Template text — review with your legal adviser and complete the bracketed details before going live.</p>
        <div className="s-prose mt-8">{children}</div>
      </div>
    </>
  );
}
