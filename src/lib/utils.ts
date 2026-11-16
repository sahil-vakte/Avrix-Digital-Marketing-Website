export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/London",
  });
}

export function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

export function money(v: string | number | null | undefined, currency = "GBP") {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v));
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export function toCsv(rows: (string | number | null | undefined | Date)[][]) {
  return rows
    .map((r) => r.map((c) => {
      const v = c instanceof Date ? c.toISOString() : c === null || c === undefined ? "" : String(c);
      return /[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}"` : v;
    }).join(","))
    .join("\r\n");
}

export const str = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v.trim() : "");
export const strOrNull = (v: FormDataEntryValue | null | undefined) => str(v) || null;
