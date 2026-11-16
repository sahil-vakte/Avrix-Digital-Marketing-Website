import { describe, it, expect } from "vitest";
import { applyMerge, contactMergeData, listMergeTags } from "@/lib/merge";
import { ineligibleReason, type EligibilityContext } from "@/lib/compliance";
import { parseFreeText, autoMap, parseBusinessType, parseConsent } from "@/lib/import-parse";
import { zonedToUtc, isoWeekday } from "@/lib/time";
import { spamCheck } from "@/lib/spam-check";
import { classifySmtpError } from "@/lib/mailer";
import { inSendWindow } from "../worker/sender";
import { stripQuoted } from "../worker/imap";

describe("merge tags", () => {
  it("fills values and fallbacks", () => {
    const d = contactMergeData({ firstName: "Jane", businessName: "Acme Ltd", customFields: { industry: "Retail" } });
    expect(applyMerge("Hi {{first_name|there}} at {{business_name}} ({{custom.industry}})", d)).toBe("Hi Jane at Acme Ltd (Retail)");
    expect(applyMerge("Hi {{first_name|there}}", {})).toBe("Hi there");
    expect(applyMerge("Hi {{ first_name }}", {})).toBe("Hi ");
  });
  it("escapes HTML in values", () => {
    expect(applyMerge("<p>{{business_name}}</p>", { business_name: "<b>x</b>" }, true)).toBe("<p>&lt;b&gt;x&lt;/b&gt;</p>");
  });
  it("lists tags", () => expect(listMergeTags("{{a}} {{b|x}} {{a}}")).toEqual(["a", "b"]));
});

describe("compliance", () => {
  const ctx: EligibilityContext = { suppressed: new Set(["gone@x.com"]), countryRules: new Map([["DE", { consentRequired: true }], ["GB", { consentRequired: false }]]), unknownTypeRequiresConsent: true };
  const base = { email: "a@b.com", businessType: "LIMITED_COMPANY" as const, consentStatus: "NONE" as const, country: "GB", emailStatus: "VALID" as const };
  it("allows UK limited companies without consent", () => expect(ineligibleReason(base, ctx)).toBeNull());
  it("blocks sole traders without consent", () => expect(ineligibleReason({ ...base, businessType: "SOLE_TRADER" }, ctx)).toMatch(/Sole trader/));
  it("allows sole traders who opted in", () => expect(ineligibleReason({ ...base, businessType: "SOLE_TRADER", consentStatus: "OPTED_IN" }, ctx)).toBeNull());
  it("blocks unknown type when configured", () => expect(ineligibleReason({ ...base, businessType: "UNKNOWN" }, ctx)).toMatch(/unknown/i));
  it("applies country consent rules", () => expect(ineligibleReason({ ...base, country: "DE" }, ctx)).toMatch(/DE requires consent/));
  it("blocks suppressed", () => expect(ineligibleReason({ ...base, email: "GONE@x.com" }, ctx)).toMatch(/Suppressed/));
  it("blocks bounced", () => expect(ineligibleReason({ ...base, emailStatus: "BOUNCED" }, ctx)).toMatch(/bounced/));
});

describe("import parsing", () => {
  it("extracts rows from table-style text (PDF)", () => {
    const text = "Business Directory 2026\nAcme Engineering Ltd    John Smith    john@acme-eng.co.uk    0116 496 0000    www.acme-eng.co.uk\nBright Bakery    Sara Khan    hello@brightbakery.com    +44 7700 900123";
    const p = parseFreeText(text, "pdf");
    expect(p.rows).toHaveLength(2);
    expect(p.rows[0]).toEqual(["Acme Engineering Ltd", "John Smith", "john@acme-eng.co.uk", "0116 496 0000", "www.acme-eng.co.uk", ""]);
    expect(p.rows[1][2]).toBe("hello@brightbakery.com");
    expect(p.rows[1][1]).toBe("Sara Khan");
  });
  it("extracts rows from block-style text", () => {
    const p = parseFreeText("Northwind Traders Ltd\nContact: Peter Jones\nEmail: peter@northwind.example\n", "pdf");
    expect(p.rows[0][2]).toBe("peter@northwind.example");
    expect(p.rows[0][0]).toContain("Northwind");
  });
  it("auto-maps headers", () => {
    expect(autoMap(["E-mail", "Company Name", "Contact", "Tel", "Country"])).toEqual({ "0": "email", "1": "businessName", "2": "fullName", "3": "phone", "4": "country" });
  });
  it("detects business types and consent", () => {
    expect(parseBusinessType("Acme Widgets Ltd")).toBe("LIMITED_COMPANY");
    expect(parseBusinessType("Smith & Co LLP")).toBe("LLP");
    expect(parseBusinessType("Müller GmbH")).toBe("LIMITED_COMPANY");
    expect(parseBusinessType("sole trader")).toBe("SOLE_TRADER");
    expect(parseConsent("yes")).toBe("OPTED_IN");
    expect(parseConsent("no")).toBe("NONE");
  });
});

describe("time zones & send windows", () => {
  it("converts UK wall-clock to UTC across DST", () => {
    expect(zonedToUtc("2026-07-01", 9, 0, "Europe/London").toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedToUtc("2026-12-01", 9, 0, "Europe/London").toISOString()).toBe("2026-12-01T09:00:00.000Z");
    expect(zonedToUtc("2026-12-01", 9, 0, "Europe/Berlin").toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });
  it("weekday", () => expect(isoWeekday("2026-11-16")).toBe(1));
  it("checks send window in recipient tz", () => {
    const monday10utc = new Date("2026-11-16T10:00:00Z");
    expect(inSendWindow(monday10utc, "Europe/London", [1, 2, 3, 4, 5], 9, 17)).toBe(true);
    expect(inSendWindow(monday10utc, "Europe/London", [2], 9, 17)).toBe(false);
    expect(inSendWindow(new Date("2026-11-16T16:30:00Z"), "Europe/Berlin", [1], 9, 17)).toBe(false); // 17:30 Berlin
  });
});

describe("misc", () => {
  it("spam check flags trigger words", () => expect(spamCheck("FREE!!! guaranteed", "<p>click here</p>").warnings.length).toBeGreaterThan(1));
  it("classifies Google limit errors", () => {
    expect(classifySmtpError({ responseCode: 550, response: "550 5.4.5 Daily user sending limit exceeded" }).kind).toBe("limit");
    expect(classifySmtpError({ responseCode: 550, response: "550 5.1.1 The email account does not exist" }).kind).toBe("permanent");
    expect(classifySmtpError({ responseCode: 421, response: "421 4.7.0 Try again later" }).kind).toBe("temporary");
    expect(classifySmtpError({ code: "EAUTH", responseCode: 535 }).kind).toBe("auth");
  });
  it("strips quoted replies", () => {
    expect(stripQuoted("Yes, let's talk Tuesday.\n\nOn Mon, 16 Nov 2026 at 10:00, AB <ab@x.com> wrote:\n> Hi Jane")).toBe("Yes, let's talk Tuesday.");
  });
});
