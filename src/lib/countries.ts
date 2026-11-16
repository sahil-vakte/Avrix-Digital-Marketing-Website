// Countries served (UK + EU/EEA + Switzerland) with default time zone and a
// conservative default for whether B2B marketing email needs prior consent.
// Defaults are a starting point only — review them with your legal adviser and
// adjust in Admin → Settings → Country rules.
export const COUNTRIES: { code: string; name: string; tz: string; consentRequired: boolean }[] = [
  { code: "GB", name: "United Kingdom", tz: "Europe/London", consentRequired: false },
  { code: "IE", name: "Ireland", tz: "Europe/Dublin", consentRequired: false },
  { code: "FR", name: "France", tz: "Europe/Paris", consentRequired: false },
  { code: "DE", name: "Germany", tz: "Europe/Berlin", consentRequired: true },
  { code: "AT", name: "Austria", tz: "Europe/Vienna", consentRequired: true },
  { code: "NL", name: "Netherlands", tz: "Europe/Amsterdam", consentRequired: false },
  { code: "BE", name: "Belgium", tz: "Europe/Brussels", consentRequired: false },
  { code: "LU", name: "Luxembourg", tz: "Europe/Luxembourg", consentRequired: false },
  { code: "ES", name: "Spain", tz: "Europe/Madrid", consentRequired: true },
  { code: "PT", name: "Portugal", tz: "Europe/Lisbon", consentRequired: false },
  { code: "IT", name: "Italy", tz: "Europe/Rome", consentRequired: true },
  { code: "DK", name: "Denmark", tz: "Europe/Copenhagen", consentRequired: true },
  { code: "SE", name: "Sweden", tz: "Europe/Stockholm", consentRequired: false },
  { code: "FI", name: "Finland", tz: "Europe/Helsinki", consentRequired: false },
  { code: "NO", name: "Norway", tz: "Europe/Oslo", consentRequired: true },
  { code: "PL", name: "Poland", tz: "Europe/Warsaw", consentRequired: true },
  { code: "CZ", name: "Czechia", tz: "Europe/Prague", consentRequired: false },
  { code: "SK", name: "Slovakia", tz: "Europe/Bratislava", consentRequired: false },
  { code: "HU", name: "Hungary", tz: "Europe/Budapest", consentRequired: true },
  { code: "RO", name: "Romania", tz: "Europe/Bucharest", consentRequired: false },
  { code: "BG", name: "Bulgaria", tz: "Europe/Sofia", consentRequired: false },
  { code: "GR", name: "Greece", tz: "Europe/Athens", consentRequired: true },
  { code: "HR", name: "Croatia", tz: "Europe/Zagreb", consentRequired: false },
  { code: "SI", name: "Slovenia", tz: "Europe/Ljubljana", consentRequired: true },
  { code: "EE", name: "Estonia", tz: "Europe/Tallinn", consentRequired: false },
  { code: "LV", name: "Latvia", tz: "Europe/Riga", consentRequired: false },
  { code: "LT", name: "Lithuania", tz: "Europe/Vilnius", consentRequired: false },
  { code: "CY", name: "Cyprus", tz: "Asia/Nicosia", consentRequired: false },
  { code: "MT", name: "Malta", tz: "Europe/Malta", consentRequired: false },
  { code: "CH", name: "Switzerland", tz: "Europe/Zurich", consentRequired: false },
];

export const countryName = (code?: string | null) => COUNTRIES.find((c) => c.code === code)?.name ?? code ?? "—";

const ALIASES: Record<string, string> = { UK: "GB", "UNITED KINGDOM": "GB", ENGLAND: "GB", SCOTLAND: "GB", WALES: "GB", "GREAT BRITAIN": "GB" };
export function normaliseCountry(v: string | undefined | null, fallback = "GB"): string {
  if (!v) return fallback;
  const s = v.trim().toUpperCase();
  if (ALIASES[s]) return ALIASES[s];
  if (COUNTRIES.some((c) => c.code === s)) return s;
  const byName = COUNTRIES.find((c) => c.name.toUpperCase() === s);
  return byName?.code ?? fallback;
}
