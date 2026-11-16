export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-16 lg:py-24">
      <h1 className="h-display text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: {updated}</p>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Template text — review with your legal adviser and complete the bracketed details before going live.</p>
      <div className="prose-x mt-8">{children}</div>
    </div>
  );
}
