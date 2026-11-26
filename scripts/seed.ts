import "./load-env";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool, t } from "../src/db";
import { COUNTRIES } from "../src/lib/countries";
import { STAGE_PRESETS } from "../src/lib/stage-presets";

async function main() {
  // Admin user
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe-OnFirstLogin-2026!";
  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (!existing) {
    await db.insert(t.users).values({
      email, name: process.env.ADMIN_NAME ?? "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`✓ Admin user created: ${email}`);
  } else console.log(`• Admin user exists: ${email}`);

  // Applications — every website / product whose leads land in this CRM.
  const apps = [
    { id: "app-avrix-europe", key: "avrix-europe", name: "Avrix UK & Europe", domain: "avrix-europe.com", color: "#3563f2", dataClass: "BUSINESS" as const, sortOrder: 1, preset: "europe" },
    { key: "avrix-digital", name: "AVRIX Digital", domain: "avrixdigital.com", color: "#db2777", dataClass: "BUSINESS" as const, sortOrder: 2, preset: "agency",
      recordUrlTemplate: "https://avrixdigital.com/manage-7f3k/enquiries/enquiry/{id}/change/" },
    { key: "medicolex", name: "Medicolex", domain: "medicolex.co.uk", color: "#0891b2", dataClass: "HEALTH" as const, sortOrder: 3, preset: "medicolegal", campaignsAllowed: false },
    { key: "seuk", name: "Shoulder Elbow Consultant", domain: "shoulderelbowconsultant.co.uk", color: "#15803d", dataClass: "HEALTH" as const, sortOrder: 4, preset: "clinic", campaignsAllowed: false },
    { key: "growth-suite", name: "Growth Suite", domain: null, color: "#7c3aed", dataClass: "BUSINESS" as const, sortOrder: 5, preset: "sales" },
    { key: "atlis-crm", name: "atlis.cloud CRM", domain: "atlis.cloud", color: "#b45309", dataClass: "BUSINESS" as const, sortOrder: 6, preset: "sales" },
  ];
  const europeStages = [
    { name: "New", color: "#3563f2" }, { name: "Contacted", color: "#0ea5e9" }, { name: "Replied", color: "#8b5cf6" },
    { name: "Meeting booked", color: "#f59e0b" }, { name: "Proposal sent", color: "#f97316" },
    { name: "Won", color: "#16a34a", isWon: true }, { name: "Lost", color: "#9ca3af", isLost: true },
  ];
  for (const { preset, ...a } of apps) {
    await db.insert(t.applications).values(a).onConflictDoNothing({ target: t.applications.key });
    const app = (await db.query.applications.findFirst({ where: (x, { eq }) => eq(x.key, a.key) }))!;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.pipelineStages).where(sql`${t.pipelineStages.applicationId} = ${app.id}`);
    if (n === 0) {
      const list = preset === "europe" ? europeStages : STAGE_PRESETS[preset];
      await db.insert(t.pipelineStages).values(list.map((s, i) => ({ ...s, order: i + 1, applicationId: app.id })));
      console.log(`✓ Pipeline created for ${app.name}`);
    }
  }

  // Country rules
  await db.insert(t.countryRules).values(
    COUNTRIES.map((c) => ({ countryCode: c.code, name: c.name, timezone: c.tz, consentRequired: c.consentRequired })),
  ).onConflictDoNothing();

  // Website content (only when empty)
  const [{ n: planCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.pricingPlans);
  if (planCount === 0) {
    await db.insert(t.pricingPlans).values([
      { name: "Launch", tagline: "Get found and start generating enquiries", priceGbp: "495", priceEur: "575", order: 1,
        features: ["Google Ads or Meta Ads (one channel)", "Conversion tracking set-up", "Monthly performance report", "Email support"] },
      { name: "Growth", tagline: "Our most popular plan for SMEs", priceGbp: "995", priceEur: "1150", order: 2, highlight: true,
        features: ["Google Ads + Meta Ads", "Landing page optimisation", "CRM & lead tracking", "Email & WhatsApp follow-up", "Fortnightly strategy call"] },
      { name: "Scale", tagline: "Full-funnel marketing team on demand", priceGbp: "1950", priceEur: "2250", order: 3,
        features: ["Everything in Growth", "SEO & content (4 articles / month)", "Marketing automation", "Dedicated account manager", "Weekly reporting"] },
      { name: "Website build", tagline: "Fast, conversion-focused website", priceGbp: "2500", priceEur: "2900", period: "one-off", order: 4,
        features: ["Up to 8 pages", "Mobile-first design", "SEO foundations", "Lead forms connected to CRM"] },
    ]);
  }
  const [{ n: faqCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.faqs);
  if (faqCount === 0) {
    await db.insert(t.faqs).values([
      { order: 1, question: "Who do you work with?", answer: "Small and medium-sized businesses across the UK and Europe that want a steady flow of qualified enquiries — from professional services and trades to e-commerce and healthcare." },
      { order: 2, question: "Is there a minimum contract?", answer: "Monthly plans run on a rolling 30-day basis after an initial three-month period, so we have enough data to optimise properly." },
      { order: 3, question: "Do I keep ownership of my ad accounts and data?", answer: "Yes. Ad accounts, analytics, CRM data and website are set up in your name. If you ever leave, everything stays with you." },
      { order: 4, question: "Can you work in languages other than English?", answer: "Yes — we run campaigns for European markets and can localise ads and landing pages." },
      { order: 5, question: "How quickly will I see results?", answer: "Paid campaigns usually generate enquiries within the first two weeks. SEO and content build over three to six months." },
      { order: 6, question: "How do you report on performance?", answer: "You get a live dashboard plus a plain-English monthly report that ties spend to enquiries and revenue, not just clicks." },
    ]);
  }
  const [{ n: postCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.posts);
  if (postCount === 0) {
    await db.insert(t.posts).values({
      title: "Five ways SMEs waste their Google Ads budget (and how to fix them)",
      slug: "five-ways-smes-waste-google-ads-budget",
      excerpt: "Most small-business ad accounts leak money in the same places. Here is where to look first.",
      category: "Google Ads",
      status: "PUBLISHED",
      publishedAt: new Date(),
      body: "<p>Most small-business Google Ads accounts lose money in the same predictable places. Before increasing your budget, check these five.</p><h2>1. Broad match without negatives</h2><p>Broad match can work, but only with a well-maintained negative keyword list. Review your search terms report weekly.</p><h2>2. No conversion tracking</h2><p>If Google cannot see which clicks become enquiries, it cannot optimise for them. Track form submissions, calls and WhatsApp clicks.</p><h2>3. Sending traffic to the home page</h2><p>Every ad group should land on a page that matches the search. Relevance lifts conversion rate and lowers cost per click.</p><h2>4. Ignoring location and schedule</h2><p>Exclude areas you cannot serve and lower bids outside your opening hours.</p><h2>5. Never testing ads</h2><p>Run at least two responsive search ads per ad group and replace the weaker one monthly.</p>",
    });
  }
  const [{ n: csCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.caseStudies);
  if (csCount === 0) {
    await db.insert(t.caseStudies).values({
      title: "Doubling qualified enquiries for a UK home-services firm",
      slug: "doubling-enquiries-home-services",
      client: "Example Home Services Ltd",
      industry: "Home services",
      summary: "A rebuilt Google Ads account, new landing pages and WhatsApp follow-up turned paid search into the firm's main source of jobs.",
      body: "<p>This is a sample case study. Replace it with a real client story from Admin → Content → Case studies.</p>",
      results: ["2.1× qualified enquiries", "−38% cost per lead", "Replies within 5 minutes via WhatsApp"],
      status: "PUBLISHED",
    });
  }
  const [{ n: tplCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.templates);
  if (tplCount === 0) {
    await db.insert(t.templates).values({
      applicationId: "app-avrix-europe",
      name: "Intro — plain text style",
      subject: "Quick question about {{business_name}}",
      html: "<p>Hi {{first_name|there}},</p><p>I came across {{business_name}} and wanted to ask a quick question: are you happy with the number of enquiries you get from Google and social media at the moment?</p><p>We help UK and European SMEs turn ad spend into booked calls — with tracking that shows exactly which campaigns bring in revenue.</p><p>Would a 15-minute call next week be useful?</p><p>Best regards,<br>AB<br>Avrix UK &amp; Europe</p>",
    });
  }
  console.log("✓ Seed complete");
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
