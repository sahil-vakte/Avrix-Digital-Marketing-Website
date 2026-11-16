import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-2xl font-extrabold">{title}</h1>{sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white", className)}>
      {title && <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-bold">{title}</h2>{actions}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      {sub && <p className={cn("text-xs", tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-ink-500")}>{sub}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-800",
  blue: "bg-brand-50 text-brand-700", gray: "bg-gray-100 text-ink-700", violet: "bg-violet-50 text-violet-700",
};
const STATUS_TONE: Record<string, string> = {
  DRAFT: "gray", PENDING_APPROVAL: "amber", SCHEDULED: "violet", SENDING: "blue", PAUSED: "amber", COMPLETED: "green", CANCELLED: "gray",
  QUEUED: "gray", HELD: "violet", ACTIVE: "blue", REPLIED: "green", BOUNCED: "red", UNSUBSCRIBED: "amber", COMPLAINED: "red", EXCLUDED: "gray", FAILED: "red",
  SENT: "blue", SENDING_: "blue", VALID: "green", RISKY: "amber", INVALID: "red", UNVERIFIED: "gray",
  OPTED_IN: "green", LEGITIMATE_INTEREST: "blue", NONE: "gray", PUBLISHED: "green", CONFIRMED: "green",
};
export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const k = tone ?? STATUS_TONE[String(children)] ?? "gray";
  return <span className={cn("badge", TONES[k] ?? TONES.gray)}>{String(children).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-ink-500">{children}</div>;
}

export function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-ink-500">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="btn-ghost btn-sm">← Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="btn-ghost btn-sm">Next →</Link>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}</label>;
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return <div className={cn("mb-4 rounded-lg p-3 text-sm", error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")} role="status">{error ?? ok}</div>;
}
