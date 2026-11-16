// Parses uploaded contact files into a header row + data rows.
import * as XLSX from "xlsx";

export type Parsed = { headers: string[]; rows: string[][]; kind: "csv" | "xlsx" | "pdf" | "text" };

export async function parseUpload(fileName: string, buf: Buffer): Promise<Parsed> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return parsePdf(buf);
  if (["csv", "tsv", "txt"].includes(ext) && !looksTabular(buf)) return parseFreeText(buf.toString("utf8"), "text");
  const wb = XLSX.read(buf, { type: "buffer", raw: false, codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", blankrows: false, raw: false })
    .map((r) => r.map((c) => String(c ?? "").trim()));
  const nonEmpty = data.filter((r) => r.some((c) => c));
  if (!nonEmpty.length) return { headers: [], rows: [], kind: ext === "csv" ? "csv" : "xlsx" };
  const headers = nonEmpty[0].map((h, i) => h || `Column ${i + 1}`);
  const width = Math.max(headers.length, ...nonEmpty.map((r) => r.length));
  while (headers.length < width) headers.push(`Column ${headers.length + 1}`);
  return { headers, rows: nonEmpty.slice(1).map((r) => pad(r, width)), kind: ext === "csv" ? "csv" : "xlsx" };
}

function looksTabular(buf: Buffer) {
  const first = buf.toString("utf8", 0, 2000).split(/\r?\n/)[0] ?? "";
  return /[,;\t]/.test(first);
}
const pad = (r: string[], n: number) => (r.length >= n ? r.slice(0, n) : [...r, ...Array(n - r.length).fill("")]);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_ONE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/i;

async function parsePdf(buf: Buffer): Promise<Parsed> {
  // Import the library entry directly (the package index runs a debug harness).
  const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default as (b: Buffer) => Promise<{ text: string }>;
  const { text } = await pdf(buf);
  return parseFreeText(text, "pdf");
}

/**
 * Heuristic extraction from unstructured text (PDF directories, pasted lists):
 * one row per email address, with nearby text split into business / owner / phone / website.
 */
export function parseFreeText(text: string, kind: "pdf" | "text"): Parsed {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim());
  const headers = ["Business name", "Owner name", "Email", "Phone", "Website", "Other text"];
  const rows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const emails = lines[i].match(EMAIL);
    if (!emails) continue;
    for (const email of emails) {
      // Table-style rows carry everything on one line; directory-style blocks put the
      // name/business on the 1–2 lines above the email. Pick whichever applies.
      const own = lines[i].replace(email, " ");
      const ownCells = own.split(/\s{2,}|\t|\||;/).map((c) => c.trim()).filter((c) => c.length > 1);
      const above = [lines[i - 2], lines[i - 1]].filter((l): l is string => !!l && !EMAIL_ONE.test(l));
      const ctx = ownCells.length >= 2 ? own : [...above, own].join(" | ");
      const cells = ctx.split(/\s{2,}|\t|\||;|,(?=\s*[A-Z])/).map((c) => c.trim()).filter((c) => c && c.length > 1);
      let phone = "", website = "", owner = "", business = "";
      const rest: string[] = [];
      for (const raw of cells) {
        const c = raw.trim();
        if (!phone && PHONE.test(c) && c.replace(/\D/g, "").length >= 9) { phone = c.match(PHONE)![1].trim(); continue; }
        if (!website && URL_RE.test(c) && !c.includes("@") && /\.[a-z]{2,}/i.test(c) && !/\s/.test(c.match(URL_RE)![1])) { website = c.match(URL_RE)![1]; continue; }
        if (/^(email|e-mail|tel|phone|mob|web|website)[:.]?$/i.test(c)) continue;
        const labelled = c.match(/^(name|owner|contact|director|business|company|organisation|organization)\s*[:\-]\s*(.+)$/i);
        if (labelled) {
          if (/^(business|company|organisation|organization)$/i.test(labelled[1])) business ||= labelled[2].trim();
          else owner ||= labelled[2].trim();
          continue;
        }
        if (/^(email|e-mail|tel|phone|mob|web|website)\s*[:\-]/i.test(c)) continue;
        rest.push(c);
      }
      const BIZ = /\b(ltd|limited|llp|plc|gmbh|inc|llc|co\.?|company|group|services|solutions|consulting|traders?|holdings|partners|associates|studio|agency|bakery|cafe|restaurant|clinic|dental|salon|garage|motors|construction|builders|plumbing|electrical|&)\b/i;
      const personLike = (x: string) => /^[A-Z][a-z'’-]+(\s+[A-Z][a-z'’-]+){1,2}$/.test(x) && !BIZ.test(x);
      if (!business) business = rest.find((x) => x !== owner && (BIZ.test(x) || !personLike(x))) ?? rest.find((x) => x !== owner) ?? "";
      if (!owner) owner = rest.find((x) => x !== business && personLike(x)) ?? "";
      if (!business) business = email.split("@")[1].split(".")[0];
      rows.push([business, owner, email.toLowerCase(), phone, website, rest.filter((x) => x !== owner && x !== business).join(" · ").slice(0, 200)]);
    }
  }
  return { headers, rows, kind };
}

// ─── Column auto-mapping ───
export { TARGET_FIELDS } from "./import-fields";

const SYN: Record<string, RegExp> = {
  email: /^(e-?mail|email address|e-mail address|mail|work email|contact email)$/i,
  businessName: /^(business|business name|company|company name|organisation|organization|firm|trading name|account|account name)$/i,
  fullName: /^(name|full name|contact|contact name|owner|owner name|director|person)$/i,
  firstName: /^(first|first name|firstname|given name|forename)$/i,
  lastName: /^(last|last name|lastname|surname|family name)$/i,
  jobTitle: /^(title|job title|position|role)$/i,
  phone: /^(phone|telephone|tel|mobile|phone number|contact number)$/i,
  website: /^(website|web|url|site|domain)$/i,
  city: /^(city|town|locality)$/i,
  country: /^(country|country code)$/i,
  businessType: /^(business type|company type|entity type|legal form|type)$/i,
  consentStatus: /^(consent|consent status|opt.?in|gdpr)$/i,
  tags: /^(tags?|labels?|category|categories|industry|sector)$/i,
};

export function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((h, i) => {
    const key = Object.entries(SYN).find(([, re]) => re.test(h.trim()))?.[0];
    if (key && !Object.values(map).includes(key)) map[String(i)] = key;
    else map[String(i)] = "";
  });
  return map;
}

export function parseBusinessType(v: string): string | null {
  const s = v.toLowerCase();
  if (!s) return null;
  if (/\bllp\b/.test(s)) return "LLP";
  if (/\bplc\b/.test(s)) return "PLC";
  if (/\b(ltd|limited|gmbh|sarl|s\.?a\.?r\.?l|bv|b\.v\.|sa|s\.a\.|srl|s\.r\.l\.|ab|oy|as|a\/s|aps|sp\.? z o\.?o|kft|s\.l\.|sl|ag|nv|company)\b/.test(s)) return "LIMITED_COMPANY";
  if (/sole|self.?employed|freelance|individual/.test(s)) return "SOLE_TRADER";
  if (/partnership/.test(s)) return "PARTNERSHIP";
  if (/council|nhs|government|public|authority|school|university/.test(s)) return "PUBLIC_BODY";
  return null;
}

export function parseConsent(v: string): string | null {
  const s = v.toLowerCase().trim();
  if (!s) return null;
  if (/^(y|yes|true|1|opted.?in|opt.?in|consent(ed)?)$/.test(s)) return "OPTED_IN";
  if (/legitimate|li\b/.test(s)) return "LEGITIMATE_INTEREST";
  if (/^(n|no|false|0|none|opted.?out)$/.test(s)) return "NONE";
  return null;
}
