// Merge tags: {{first_name}}, {{business_name|there}}, {{custom.industry}}
export type MergeData = Record<string, string | null | undefined>;

export function contactMergeData(c: {
  firstName?: string | null; lastName?: string | null; businessName?: string | null; email?: string | null;
  city?: string | null; country?: string | null; jobTitle?: string | null; website?: string | null; phone?: string | null;
  customFields?: Record<string, string> | null;
}): MergeData {
  const data: MergeData = {
    first_name: c.firstName, last_name: c.lastName,
    full_name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
    business_name: c.businessName, email: c.email, city: c.city, country: c.country,
    job_title: c.jobTitle, website: c.website, phone: c.phone,
  };
  for (const [k, v] of Object.entries(c.customFields ?? {})) data[`custom.${k}`] = v;
  return data;
}

const TAG = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;

export function applyMerge(template: string, data: MergeData, escape = false): string {
  return template.replace(TAG, (_m, key: string, fallback?: string) => {
    const v = data[key.toLowerCase()] ?? data[key];
    const out = v && String(v).trim() ? String(v) : (fallback ?? "");
    return escape ? escapeHtml(out) : out;
  });
}

export function listMergeTags(template: string): string[] {
  return [...new Set([...template.matchAll(TAG)].map((m) => m[1]))];
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const MERGE_TAGS = [
  { tag: "{{first_name|there}}", label: "First name" },
  { tag: "{{last_name}}", label: "Last name" },
  { tag: "{{business_name}}", label: "Business name" },
  { tag: "{{city}}", label: "City" },
  { tag: "{{job_title}}", label: "Job title" },
  { tag: "{{website}}", label: "Website" },
];
