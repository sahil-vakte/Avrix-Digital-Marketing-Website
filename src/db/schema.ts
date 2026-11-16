// Avrix UK & Europe — database schema (PostgreSQL, Drizzle ORM)
import { relations, sql } from "drizzle-orm";
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, numeric, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const ts = (name: string) => timestamp(name, { withTimezone: true });
const textArr = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

// ───────────── Enums ─────────────
export const roleEnum = pgEnum("role", ["ADMIN", "STAFF"]);
export const businessTypeEnum = pgEnum("business_type", [
  "LIMITED_COMPANY", "LLP", "PLC", "PUBLIC_BODY", "SOLE_TRADER", "PARTNERSHIP", "UNKNOWN",
]);
export const consentEnum = pgEnum("consent_status", ["OPTED_IN", "LEGITIMATE_INTEREST", "NONE"]);
export const emailStatusEnum = pgEnum("email_status", ["UNVERIFIED", "VALID", "RISKY", "INVALID", "BOUNCED"]);
export const listTypeEnum = pgEnum("list_type", ["STATIC", "SEGMENT"]);
export const importStatusEnum = pgEnum("import_status", ["UPLOADED", "MAPPED", "PROCESSING", "COMPLETED", "FAILED"]);
export const suppressionReasonEnum = pgEnum("suppression_reason", [
  "UNSUBSCRIBED", "HARD_BOUNCE", "COMPLAINT", "MANUAL", "ERASED",
]);
export const leadSourceEnum = pgEnum("lead_source", [
  "WEBSITE_FORM", "BOOKING", "CAMPAIGN_REPLY", "MANUAL", "WHATSAPP", "PHONE", "OTHER",
]);
export const bookingStatusEnum = pgEnum("booking_status", ["CONFIRMED", "CANCELLED", "COMPLETED"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "DRAFT", "PENDING_APPROVAL", "SCHEDULED", "SENDING", "PAUSED", "COMPLETED", "CANCELLED",
]);
export const recipientStatusEnum = pgEnum("recipient_status", [
  "QUEUED", "HELD", "ACTIVE", "COMPLETED", "REPLIED", "BOUNCED", "UNSUBSCRIBED", "COMPLAINED", "EXCLUDED", "FAILED",
]);
export const messageKindEnum = pgEnum("message_kind", ["CAMPAIGN", "FOLLOW_UP", "ONE_TO_ONE", "TEST", "SYSTEM"]);
export const messageStatusEnum = pgEnum("message_status", ["QUEUED", "SENDING", "SENT", "FAILED", "BOUNCED", "CANCELLED"]);
export const eventTypeEnum = pgEnum("event_type", ["SENT", "OPEN", "CLICK", "REPLY", "BOUNCE", "UNSUBSCRIBE", "COMPLAINT"]);
export const publishStatusEnum = pgEnum("publish_status", ["DRAFT", "PUBLISHED"]);

// ───────────── Users & security ─────────────
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  totpSecret: text("totp_secret"), // AES-GCM encrypted
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  active: boolean("active").notNull().default(true),
  resetToken: text("reset_token").unique(),
  resetExpiresAt: ts("reset_expires_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  diff: jsonb("diff"),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

// ───────────── Contacts ─────────────
export const importJobs = pgTable("import_jobs", {
  id: id(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  headers: textArr("headers"),
  rows: jsonb("rows").$type<string[][]>().notNull(),
  mapping: jsonb("mapping").$type<Record<string, string>>(),
  defaults: jsonb("defaults").$type<Record<string, string>>(),
  status: importStatusEnum("status").notNull().default("UPLOADED"),
  total: integer("total").notNull().default(0),
  imported: integer("imported").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  invalid: integer("invalid").notNull().default(0),
  errors: jsonb("errors").$type<{ row: number; email: string; reason: string }[]>(),
  listId: text("list_id"),
  createdById: text("created_by_id"),
  createdAt: createdAt(),
  completedAt: ts("completed_at"),
});

export const contacts = pgTable("contacts", {
  id: id(),
  email: text("email").notNull().unique(),
  businessName: text("business_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  phone: text("phone"),
  website: text("website"),
  city: text("city"),
  country: text("country").notNull().default("GB"),
  businessType: businessTypeEnum("business_type").notNull().default("UNKNOWN"),
  consentStatus: consentEnum("consent_status").notNull().default("NONE"),
  consentAt: ts("consent_at"),
  lawfulBasis: text("lawful_basis"),
  source: text("source").notNull(),
  emailStatus: emailStatusEnum("email_status").notNull().default("UNVERIFIED"),
  emailFlags: textArr("email_flags"),
  tags: textArr("tags"),
  customFields: jsonb("custom_fields").$type<Record<string, string>>().notNull().default({}),
  lastEmailedAt: ts("last_emailed_at"),
  lastEngagedAt: ts("last_engaged_at"),
  importJobId: text("import_job_id").references(() => importJobs.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("contacts_country_idx").on(t.country),
  index("contacts_btype_idx").on(t.businessType),
  index("contacts_consent_idx").on(t.consentStatus),
  index("contacts_created_idx").on(t.createdAt),
]);

export const lists = pgTable("lists", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  type: listTypeEnum("type").notNull().default("STATIC"),
  segmentRules: jsonb("segment_rules").$type<SegmentRules>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SegmentRules = {
  countries?: string[];
  businessTypes?: string[];
  consentStatuses?: string[];
  tags?: string[];
  notEmailedDays?: number;
  search?: string;
};

export const listMembers = pgTable("list_members", {
  listId: text("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  addedAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.listId, t.contactId] }), index("list_members_contact_idx").on(t.contactId)]);

export const importMappings = pgTable("import_mappings", {
  id: id(),
  name: text("name").notNull().unique(),
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull(),
  createdAt: createdAt(),
});

export const suppressions = pgTable("suppressions", {
  id: id(),
  email: text("email").notNull().unique(),
  reason: suppressionReasonEnum("reason").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

export const countryRules = pgTable("country_rules", {
  countryCode: text("country_code").primaryKey(),
  name: text("name").notNull(),
  consentRequired: boolean("consent_required").notNull().default(false),
  timezone: text("timezone").notNull().default("Europe/London"),
  note: text("note"),
});

// ───────────── CRM ─────────────
export const pipelineStages = pgTable("pipeline_stages", {
  id: id(),
  name: text("name").notNull().unique(),
  order: integer("order").notNull(),
  color: text("color").notNull().default("#3563f2"),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
});

export const leads = pgTable("leads", {
  id: id(),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  businessName: text("business_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  country: text("country"),
  service: text("service"),
  budget: text("budget"),
  message: text("message"),
  source: leadSourceEnum("source").notNull().default("MANUAL"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  stageId: text("stage_id").notNull().references(() => pipelineStages.id),
  value: numeric("value", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("GBP"),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  tags: textArr("tags"),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("leads_stage_idx").on(t.stageId), index("leads_email_idx").on(t.email), index("leads_created_idx").on(t.createdAt)]);

export const notes = pgTable("notes", {
  id: id(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: ts("due_at"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  done: boolean("done").notNull().default(false),
  createdAt: createdAt(),
});

export const activities = pgTable("activities", {
  id: id(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
}, (t) => [index("activities_lead_idx").on(t.leadId, t.createdAt)]);

export const bookings = pgTable("bookings", {
  id: id(),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  topic: text("topic"),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  status: bookingStatusEnum("status").notNull().default("CONFIRMED"),
  createdAt: createdAt(),
}, (t) => [index("bookings_starts_idx").on(t.startsAt)]);

// ───────────── Email campaigns ─────────────
export const templates = pgTable("templates", {
  id: id(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const campaigns = pgTable("campaigns", {
  id: id(),
  name: text("name").notNull(),
  fromName: text("from_name").notNull(),
  replyTo: text("reply_to"),
  subjectA: text("subject_a").notNull(),
  subjectB: text("subject_b"),
  abTestPercent: integer("ab_test_percent").notNull().default(20),
  abWinnerMetric: text("ab_winner_metric").notNull().default("open"),
  abWaitHours: integer("ab_wait_hours").notNull().default(4),
  abWinner: text("ab_winner"),
  abTestEndsAt: ts("ab_test_ends_at"),
  html: text("html").notNull().default(""),
  listIds: textArr("list_ids"),
  status: campaignStatusEnum("status").notNull().default("DRAFT"),
  scheduledAt: ts("scheduled_at"),
  sendDays: integer("send_days").array().notNull().default(sql`'{1,2,3,4,5}'::integer[]`),
  sendStartHour: integer("send_start_hour").notNull().default(9),
  sendEndHour: integer("send_end_hour").notNull().default(17),
  useRecipientTz: boolean("use_recipient_tz").notNull().default(true),
  trackOpens: boolean("track_opens").notNull().default(true),
  trackClicks: boolean("track_clicks").notNull().default(true),
  pauseReason: text("pause_reason"),
  createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: text("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  launchedAt: ts("launched_at"),
  completedAt: ts("completed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: id(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  order: integer("order").notNull(), // 1..3 (0 = campaign's initial email)
  delayDays: integer("delay_days").notNull(),
  subject: text("subject"), // empty = "Re: <original subject>" in the same thread
  html: text("html").notNull(),
}, (t) => [uniqueIndex("steps_campaign_order_uq").on(t.campaignId, t.order)]);

export const campaignRecipients = pgTable("campaign_recipients", {
  id: id(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  variant: text("variant"),
  token: text("token").notNull().unique(),
  status: recipientStatusEnum("status").notNull().default("QUEUED"),
  excludeReason: text("exclude_reason"),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  firstOpenAt: ts("first_open_at"),
  lastOpenAt: ts("last_open_at"),
  repliedAt: ts("replied_at"),
  replySnippet: text("reply_snippet"),
  bouncedAt: ts("bounced_at"),
  unsubscribedAt: ts("unsubscribed_at"),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("recipients_campaign_email_uq").on(t.campaignId, t.email),
  index("recipients_campaign_status_idx").on(t.campaignId, t.status),
]);

export const emailMessages = pgTable("email_messages", {
  id: id(),
  kind: messageKindEnum("kind").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").references(() => campaignRecipients.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  stepOrder: integer("step_order").notNull().default(0),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  html: text("html"),
  token: text("token").notNull().unique(),
  status: messageStatusEnum("status").notNull().default("QUEUED"),
  scheduledFor: ts("scheduled_for").notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  messageId: text("message_id").unique(),
  inReplyTo: text("in_reply_to"),
  sentAt: ts("sent_at"),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  index("messages_status_sched_idx").on(t.status, t.scheduledFor),
  index("messages_sent_idx").on(t.sentAt),
  index("messages_campaign_step_idx").on(t.campaignId, t.stepOrder),
]);

export const links = pgTable("links", {
  id: id(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
}, (t) => [uniqueIndex("links_campaign_url_uq").on(t.campaignId, t.url)]);

export const emailEvents = pgTable("email_events", {
  id: id(),
  type: eventTypeEnum("type").notNull(),
  messageId: text("message_id").references(() => emailMessages.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").references(() => campaignRecipients.id, { onDelete: "cascade" }),
  linkId: text("link_id").references(() => links.id, { onDelete: "set null" }),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  machine: boolean("machine").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  index("events_recipient_idx").on(t.recipientId, t.createdAt),
  index("events_type_idx").on(t.type, t.createdAt),
  index("events_message_idx").on(t.messageId),
]);

// ───────────── Website content ─────────────
export const posts = pgTable("posts", {
  id: id(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  body: text("body").notNull(),
  category: text("category"),
  coverImage: text("cover_image"),
  seoTitle: text("seo_title"),
  seoDesc: text("seo_desc"),
  status: publishStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const caseStudies = pgTable("case_studies", {
  id: id(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  client: text("client").notNull(),
  industry: text("industry"),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  results: textArr("results"),
  coverImage: text("cover_image"),
  status: publishStatusEnum("status").notNull().default("DRAFT"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  page: text("page").notNull().default("home"),
  active: boolean("active").notNull().default(true),
});

export const pricingPlans = pgTable("pricing_plans", {
  id: id(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  priceGbp: numeric("price_gbp", { precision: 10, scale: 2 }).notNull(),
  priceEur: numeric("price_eur", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull().default("month"),
  features: textArr("features"),
  highlight: boolean("highlight").notNull().default(false),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

// ───────────── Relations (for db.query.*) ─────────────
export const usersRelations = relations(users, ({ many }) => ({
  leadsOwned: many(leads),
  tasks: many(tasks),
}));
export const contactsRelations = relations(contacts, ({ many }) => ({
  lists: many(listMembers),
  leads: many(leads),
  recipients: many(campaignRecipients),
}));
export const listsRelations = relations(lists, ({ many }) => ({ members: many(listMembers) }));
export const listMembersRelations = relations(listMembers, ({ one }) => ({
  list: one(lists, { fields: [listMembers.listId], references: [lists.id] }),
  contact: one(contacts, { fields: [listMembers.contactId], references: [contacts.id] }),
}));
export const leadsRelations = relations(leads, ({ one, many }) => ({
  contact: one(contacts, { fields: [leads.contactId], references: [contacts.id] }),
  stage: one(pipelineStages, { fields: [leads.stageId], references: [pipelineStages.id] }),
  owner: one(users, { fields: [leads.ownerId], references: [users.id] }),
  notes: many(notes),
  tasks: many(tasks),
  activities: many(activities),
  bookings: many(bookings),
  messages: many(emailMessages),
}));
export const stagesRelations = relations(pipelineStages, ({ many }) => ({ leads: many(leads) }));
export const notesRelations = relations(notes, ({ one }) => ({
  lead: one(leads, { fields: [notes.leadId], references: [leads.id] }),
  author: one(users, { fields: [notes.authorId], references: [users.id] }),
}));
export const tasksRelations = relations(tasks, ({ one }) => ({
  lead: one(leads, { fields: [tasks.leadId], references: [leads.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));
export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
}));
export const bookingsRelations = relations(bookings, ({ one }) => ({
  lead: one(leads, { fields: [bookings.leadId], references: [leads.id] }),
}));
export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  steps: many(sequenceSteps),
  recipients: many(campaignRecipients),
  links: many(links),
  messages: many(emailMessages),
  createdBy: one(users, { fields: [campaigns.createdById], references: [users.id] }),
}));
export const stepsRelations = relations(sequenceSteps, ({ one }) => ({
  campaign: one(campaigns, { fields: [sequenceSteps.campaignId], references: [campaigns.id] }),
}));
export const recipientsRelations = relations(campaignRecipients, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [campaignRecipients.campaignId], references: [campaigns.id] }),
  contact: one(contacts, { fields: [campaignRecipients.contactId], references: [contacts.id] }),
  messages: many(emailMessages),
  events: many(emailEvents),
}));
export const messagesRelations = relations(emailMessages, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [emailMessages.campaignId], references: [campaigns.id] }),
  recipient: one(campaignRecipients, { fields: [emailMessages.recipientId], references: [campaignRecipients.id] }),
  lead: one(leads, { fields: [emailMessages.leadId], references: [leads.id] }),
  events: many(emailEvents),
}));
export const eventsRelations = relations(emailEvents, ({ one }) => ({
  message: one(emailMessages, { fields: [emailEvents.messageId], references: [emailMessages.id] }),
  recipient: one(campaignRecipients, { fields: [emailEvents.recipientId], references: [campaignRecipients.id] }),
  link: one(links, { fields: [emailEvents.linkId], references: [links.id] }),
}));
export const linksRelations = relations(links, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [links.campaignId], references: [campaigns.id] }),
  events: many(emailEvents),
}));

export type Contact = typeof contacts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type User = typeof users.$inferSelect;
export type CountryRule = typeof countryRules.$inferSelect;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
