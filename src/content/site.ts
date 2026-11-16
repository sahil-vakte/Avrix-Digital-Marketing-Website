// Website copy. Edit here (or move into the CMS later). All copy is original to Avrix.
export const SITE = {
  name: "Avrix UK & Europe",
  legal: "Avrix UK & Europe Business Marketing",
  parent: { name: "Avrix Digital", url: "https://avrixdigital.co.uk" },
  tagline: "Marketing systems that turn clicks into customers",
  description:
    "Avrix UK & Europe builds and runs joined-up marketing for SMEs — Google & Meta Ads, websites, SEO, CRM and automated follow-up — with reporting that ties every pound and euro to real enquiries.",
};

export type Service = {
  slug: string; title: string; short: string; icon: string; intro: string;
  outcomes: string[]; process: { title: string; text: string }[]; deliverables: string[];
  faqs: { q: string; a: string }[];
};

export const SERVICES: Service[] = [
  {
    slug: "google-ads", title: "Google Ads management", short: "Search, Performance Max and local campaigns built around enquiries, not clicks.", icon: "search",
    intro: "We build Google Ads accounts around the searches that actually lead to sales, track every call and form, and keep optimising weekly.",
    outcomes: ["Lower cost per enquiry", "Clear view of which keywords make money", "No wasted spend on irrelevant searches"],
    process: [
      { title: "Audit", text: "We review your account, search terms and tracking to find where budget leaks." },
      { title: "Build", text: "Tight keyword themes, tailored ads and landing pages that match each search." },
      { title: "Check", text: "Conversion tracking for forms, calls and WhatsApp is tested before launch." },
      { title: "Improve", text: "Weekly search-term cleaning, bid changes and ad testing." },
      { title: "Report", text: "Plain-English monthly reports linking spend to enquiries and revenue." },
    ],
    deliverables: ["Account structure & keyword research", "Responsive search ads", "Negative keyword lists", "Call & form tracking", "Monthly report & call"],
    faqs: [{ q: "What budget do I need?", a: "Most SMEs start between £750 and £3,000 a month in ad spend, depending on sector and area." }],
  },
  {
    slug: "meta-ads", title: "Meta Ads management", short: "Facebook and Instagram campaigns that generate leads and sales, not just likes.", icon: "megaphone",
    intro: "Creative-led Facebook and Instagram campaigns with lead forms, retargeting and offline conversion tracking.",
    outcomes: ["Steady lead flow from social", "Creative tested against real results", "Retargeting that brings visitors back"],
    process: [
      { title: "Audience", text: "We define who buys from you and build prospecting and retargeting audiences." },
      { title: "Creative", text: "Ad concepts, copy and formats designed for thumb-stopping attention." },
      { title: "Launch", text: "Pixel and Conversions API set up so Meta optimises for real leads." },
      { title: "Scale", text: "Winning ads get more budget; weak ones are replaced every fortnight." },
    ],
    deliverables: ["Pixel & Conversions API", "Lead form or landing-page funnels", "Creative testing plan", "Retargeting", "Fortnightly optimisation"],
    faqs: [{ q: "Do you create the ad images and videos?", a: "Yes — we produce static and short-form video creative, or work with your existing assets." }],
  },
  {
    slug: "seo-content", title: "SEO & content", short: "Get found on Google and in AI answers with content your customers actually search for.", icon: "pen",
    intro: "Technical fixes, local SEO and useful content that ranks — and answers the questions buyers ask Google and AI assistants.",
    outcomes: ["More organic enquiries every month", "Higher local map rankings", "Content that sales can use"],
    process: [
      { title: "Research", text: "Keyword and competitor research focused on buying intent." },
      { title: "Fix", text: "Technical SEO: speed, structure, schema and indexing." },
      { title: "Publish", text: "Monthly articles and service pages written by specialists." },
      { title: "Earn", text: "Local citations, reviews and relevant links." },
    ],
    deliverables: ["Technical audit & fixes", "Google Business Profile optimisation", "Monthly content", "Rank & traffic reporting"],
    faqs: [{ q: "How long does SEO take?", a: "Expect early movement in 6–10 weeks and meaningful growth over 3–6 months." }],
  },
  {
    slug: "websites", title: "Websites & landing pages", short: "Fast, mobile-first websites designed to turn visitors into enquiries.", icon: "layout",
    intro: "Conversion-focused websites and campaign landing pages, connected to your CRM from day one.",
    outcomes: ["Faster pages and better Google scores", "Clear calls to action on every page", "Every enquiry captured in your CRM"],
    process: [
      { title: "Plan", text: "Sitemap, messaging and wireframes built around your customers' questions." },
      { title: "Design", text: "A clean, on-brand design that works on every screen." },
      { title: "Build", text: "Fast, secure and easy to edit, with tracking built in." },
      { title: "Launch", text: "Redirects, SEO checks and testing before go-live." },
    ],
    deliverables: ["Responsive design", "Lead forms & booking", "SEO foundations", "Analytics & consent banner", "Training"],
    faqs: [{ q: "Can I edit the site myself?", a: "Yes — pages, blog posts and FAQs can be edited from a simple admin panel." }],
  },
  {
    slug: "crm-lead-management", title: "CRM & lead management", short: "Every enquiry in one place, with a clear pipeline and nothing forgotten.", icon: "users",
    intro: "We set up a simple pipeline so every enquiry — from your website, ads, email or WhatsApp — is tracked through to won or lost.",
    outcomes: ["No lost leads", "Faster response times", "Know your real cost per customer"],
    process: [
      { title: "Map", text: "We map how enquiries reach you today and where they get lost." },
      { title: "Connect", text: "Forms, ads, calls and email feed one pipeline automatically." },
      { title: "Automate", text: "Reminders, follow-ups and alerts so nobody is left waiting." },
      { title: "Measure", text: "Reports from first click to closed deal." },
    ],
    deliverables: ["Pipeline set-up", "Lead source tracking", "Task reminders", "Team training"],
    faqs: [{ q: "Will it work with my existing tools?", a: "We can import your current leads and connect most form and ad platforms." }],
  },
  {
    slug: "email-whatsapp-automation", title: "Email & WhatsApp automation", short: "Follow up instantly and consistently, without adding headcount.", icon: "message",
    intro: "Automated, personal follow-up by email and WhatsApp so new enquiries hear from you in minutes, not days.",
    outcomes: ["Replies within minutes", "More enquiries turned into calls", "Consistent nurture for slower buyers"],
    process: [
      { title: "Design", text: "We plan the messages each type of lead should receive and when." },
      { title: "Write", text: "Short, human messages in your tone of voice." },
      { title: "Automate", text: "Triggers from forms, bookings and CRM stages." },
      { title: "Optimise", text: "Open, click and reply rates reviewed monthly." },
    ],
    deliverables: ["Welcome & follow-up sequences", "WhatsApp quick replies & brochures", "Newsletter set-up", "Compliance-ready unsubscribe"],
    faqs: [{ q: "Is this GDPR compliant?", a: "We build in consent records, unsubscribe links and suppression lists as standard." }],
  },
];

export const PILLARS = [
  { title: "Build", text: "Websites, landing pages and tracking that are ready to convert.", tags: ["Websites", "Landing pages", "Tracking"] },
  { title: "Attract", text: "Google, Meta and SEO bringing the right people to you.", tags: ["Google Ads", "Meta Ads", "SEO"] },
  { title: "Convert", text: "Clear offers, fast forms and instant follow-up.", tags: ["CRO", "Lead forms", "Booking"] },
  { title: "Nurture", text: "Email and WhatsApp that keep you top of mind.", tags: ["Email", "WhatsApp", "Automation"] },
  { title: "Measure", text: "One view from first click to closed deal.", tags: ["GA4", "CRM", "Reporting"] },
  { title: "Improve", text: "Weekly tests and changes based on real results.", tags: ["A/B tests", "Optimisation", "Reviews"] },
];

export const PROBLEMS = [
  { key: "quality", label: "Poor lead quality", problem: "Plenty of enquiries, but too many time-wasters.", fix: ["Tighten targeting and negative keywords", "Qualifying questions on forms", "Optimise ads for qualified leads, not volume"] },
  { key: "followup", label: "Slow follow-up", problem: "Leads go cold before anyone calls them back.", fix: ["Instant email and WhatsApp replies", "Alerts to the right person", "Reminders until each lead is contacted"] },
  { key: "website", label: "Website not converting", problem: "Visitors arrive but rarely get in touch.", fix: ["Faster, mobile-first pages", "Clear calls to action", "Booking and WhatsApp on every page"] },
  { key: "spend", label: "Ad spend with no clear return", problem: "You spend each month but cannot see what it brings in.", fix: ["Call, form and WhatsApp tracking", "CRM linked to ad campaigns", "Reports in revenue, not clicks"] },
  { key: "launch", label: "Campaigns take too long", problem: "Every new offer means weeks of back-and-forth.", fix: ["Reusable landing-page templates", "Pre-approved ad formats", "Launch checklists"] },
  { key: "social", label: "Social media not working", problem: "Posting regularly but nothing comes from it.", fix: ["Lead-generating ad formats", "Retargeting website visitors", "Creative tested against enquiries"] },
];

export const STEPS = [
  { title: "Review", text: "A free review of your ads, website and follow-up to find the quickest wins." },
  { title: "Set up", text: "We build or fix tracking, campaigns, pages and your CRM pipeline." },
  { title: "Launch & test", text: "Campaigns go live and we test messages, audiences and offers." },
  { title: "Grow", text: "Monthly optimisation and reporting — keep us running it or take it in-house." },
];

export const JOURNEY = ["Ad or search click", "Landing page", "Form, call or WhatsApp", "Instant follow-up", "CRM pipeline", "Sale recorded"];

export const CAPABILITIES: { cat: string; items: string[] }[] = [
  { cat: "Websites & CRO", items: ["Landing pages", "Speed optimisation", "A/B testing", "Booking widgets", "Heatmaps", "Accessibility checks"] },
  { cat: "Google Ads", items: ["Search campaigns", "Performance Max", "Local campaigns", "Call tracking", "Offline conversions", "Shopping feeds"] },
  { cat: "Meta Ads", items: ["Lead forms", "Conversions API", "Retargeting", "Creative testing", "Lookalike audiences", "Catalogue ads"] },
  { cat: "SEO & content", items: ["Technical SEO", "Local SEO", "Content writing", "Schema markup", "AI answer optimisation", "Link building"] },
  { cat: "CRM & leads", items: ["Pipeline set-up", "Lead scoring", "Source tracking", "Task automation", "Data imports", "Deduplication"] },
  { cat: "Email & WhatsApp", items: ["Sequences", "Newsletters", "WhatsApp replies", "Unsubscribe handling", "Deliverability", "Templates"] },
  { cat: "Analytics", items: ["GA4", "Tag Manager", "Looker Studio", "Consent mode", "Attribution", "Monthly reports"] },
];

export const TESTIMONIALS = [
  { quote: "We finally know which ads bring in work. Enquiries are up and we spend less.", name: "Sample client", role: "Director, home services (UK)" },
  { quote: "Leads now get a reply in minutes. It has changed how we sell.", name: "Sample client", role: "Founder, B2B services (Ireland)" },
];
