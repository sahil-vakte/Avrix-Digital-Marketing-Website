import { Icon } from "../ui/Icon";

export function WhatsAppButton({ number }: { number: string }) {
  if (!number) return null;
  const text = encodeURIComponent("Hi Avrix, I'd like to talk about growing my business.");
  return (
    <a href={`https://wa.me/${number}?text=${text}`} target="_blank" rel="noopener" data-track="whatsapp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-95">
      <Icon name="whatsapp" fill className="h-5 w-5" /> <span className="hidden sm:inline">WhatsApp us</span>
    </a>
  );
}
