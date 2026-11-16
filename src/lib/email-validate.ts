import { promises as dns } from "node:dns";

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "moakt.com", "spamgourmet.com",
]);
const ROLE = new Set(["info", "admin", "sales", "support", "contact", "hello", "office", "enquiries", "enquiry", "accounts", "noreply", "no-reply", "webmaster", "postmaster", "abuse", "billing", "team", "marketing", "help", "mail"]);

export const normaliseEmail = (e: string) => e.trim().toLowerCase().replace(/^mailto:/, "");
export const isValidSyntax = (e: string) => EMAIL_RE.test(e) && e.length <= 254;

const mxCache = new Map<string, boolean>();
const DEFINITE = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);
/** false only when DNS definitively says the domain cannot receive mail; DNS outages count as "ok". */
export async function hasMx(domain: string, timeoutMs = 4000): Promise<boolean> {
  if (mxCache.has(domain)) return mxCache.get(domain)!;
  const lookup = (async () => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length && !(mx.length === 1 && mx[0].exchange === "")) return true; // RFC 7505 null MX = no mail
      return mx.length === 0 ? fallbackA(domain) : false;
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (!DEFINITE.has(code)) return true;
      return fallbackA(domain);
    }
  })();
  const timeout = new Promise<boolean>((res) => setTimeout(() => res(true), timeoutMs));
  const ok = await Promise.race([lookup, timeout]);
  mxCache.set(domain, ok);
  return ok;
}

async function fallbackA(domain: string) {
  // RFC 5321: with no MX record, mail goes to the A record.
  try { return (await dns.resolve4(domain)).length > 0; }
  catch (e) { return !DEFINITE.has((e as { code?: string }).code ?? ""); }
}

export type EmailCheck = { email: string; status: "VALID" | "RISKY" | "INVALID"; flags: string[]; reason?: string };

export async function checkEmail(raw: string, opts: { mx?: boolean } = { mx: true }): Promise<EmailCheck> {
  const email = normaliseEmail(raw);
  if (!isValidSyntax(email)) return { email, status: "INVALID", flags: ["syntax"], reason: "Invalid email format" };
  const [local, domain] = email.split("@");
  const flags: string[] = [];
  if (DISPOSABLE.has(domain)) return { email, status: "INVALID", flags: ["disposable"], reason: "Disposable email domain" };
  if (ROLE.has(local)) flags.push("role");
  if (opts.mx !== false && !(await hasMx(domain))) return { email, status: "INVALID", flags: ["no_mx"], reason: "Domain has no mail server (MX)" };
  return { email, status: flags.length ? "RISKY" : "VALID", flags };
}

/** Runs checks with limited concurrency. */
export async function checkEmails(emails: string[], concurrency = 12): Promise<Map<string, EmailCheck>> {
  const out = new Map<string, EmailCheck>();
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < emails.length) {
      const e = emails[i++];
      out.set(e, await checkEmail(e));
    }
  }));
  return out;
}
