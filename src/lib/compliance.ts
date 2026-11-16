// Decides whether a contact may receive a campaign email. Used at audience
// build time and re-checked by the worker immediately before every send.
import type { Contact, CountryRule } from "@/db/schema";

export const CORPORATE_TYPES = ["LIMITED_COMPANY", "LLP", "PLC", "PUBLIC_BODY"] as const;
export const INDIVIDUAL_TYPES = ["SOLE_TRADER", "PARTNERSHIP"] as const;

export type EligibilityInput = Pick<Contact, "email" | "businessType" | "consentStatus" | "country" | "emailStatus">;
export type EligibilityContext = {
  suppressed: Set<string>;
  countryRules: Map<string, Pick<CountryRule, "consentRequired">>;
  unknownTypeRequiresConsent: boolean;
};

/** Returns null when the contact can be emailed, otherwise a human-readable reason. */
export function ineligibleReason(c: EligibilityInput, ctx: EligibilityContext): string | null {
  const email = c.email.toLowerCase();
  if (ctx.suppressed.has(email)) return "Suppressed (unsubscribed, bounced, complained or blocked)";
  if (c.emailStatus === "INVALID" || c.emailStatus === "BOUNCED") return "Invalid or bounced email";
  if (c.consentStatus === "OPTED_IN") return null;

  const rule = ctx.countryRules.get(c.country);
  if (rule?.consentRequired) return `Country rule: ${c.country} requires consent`;

  if ((INDIVIDUAL_TYPES as readonly string[]).includes(c.businessType))
    return "Sole trader / partnership without consent (PECR individual subscriber)";
  if (c.businessType === "UNKNOWN" && ctx.unknownTypeRequiresConsent)
    return "Business type unknown and no consent";
  if (c.consentStatus === "NONE" && !(CORPORATE_TYPES as readonly string[]).includes(c.businessType))
    return "No lawful basis recorded";
  return null;
}
