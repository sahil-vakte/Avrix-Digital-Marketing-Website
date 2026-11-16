export function Faq({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <details key={f.id} className="group rounded-2xl border border-s-line bg-s-surface px-5 py-4 transition open:border-s-primary/40 open:shadow-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-s-fg [&::-webkit-details-marker]:hidden">
            {f.question}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-s-primary/10 text-s-primary transition duration-300 group-open:rotate-45 group-open:bg-s-primary group-open:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </span>
          </summary>
          <p className="mt-3 pr-10 text-sm leading-6 text-s-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}
