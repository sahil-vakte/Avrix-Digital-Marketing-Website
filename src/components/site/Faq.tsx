export function Faq({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {items.map((f) => (
        <details key={f.id} className="group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
            {f.question}<span className="ml-4 text-brand-600 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-ink-700">{f.answer}</p>
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
