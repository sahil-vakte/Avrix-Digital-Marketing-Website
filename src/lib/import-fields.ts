// Shared with the client-side import mapper (no server imports here).
export const TARGET_FIELDS = [
  { key: "email", label: "Email *" },
  { key: "businessName", label: "Business name *" },
  { key: "fullName", label: "Full name (split into first/last)" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "jobTitle", label: "Job title" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "businessType", label: "Business type" },
  { key: "consentStatus", label: "Consent status" },
  { key: "tags", label: "Tags (comma separated)" },
] as const;
