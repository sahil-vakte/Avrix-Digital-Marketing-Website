CREATE TYPE "public"."data_class" AS ENUM('BUSINESS', 'HEALTH', 'RECRUITMENT');--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'WEBHOOK';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'FACEBOOK_LEAD_AD';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'CHATBOT';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'NEWSLETTER';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'JOB_APPLICATION';--> statement-breakpoint
ALTER TYPE "public"."lead_source" ADD VALUE 'SYNC';--> statement-breakpoint
CREATE TABLE "application_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"label" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"secret_enc" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"color" text DEFAULT '#3563f2' NOT NULL,
	"data_class" "data_class" DEFAULT 'BUSINESS' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"campaigns_allowed" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"alert_email" text,
	"from_name" text,
	"from_address" text,
	"reply_to" text,
	"legal_name" text,
	"postal_address" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_secure" boolean DEFAULT true NOT NULL,
	"smtp_user" text,
	"smtp_pass_enc" text,
	"record_url_template" text,
	"webhook_url" text,
	"webhook_secret_enc" text,
	"retention_months" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "intake_events" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"lead_id" text,
	"outcome" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_applications" (
	"user_id" text NOT NULL,
	"application_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_applications_user_id_application_id_pk" PRIMARY KEY("user_id","application_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"event" text NOT NULL,
	"body" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" DROP CONSTRAINT "pipeline_stages_name_unique";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD COLUMN "application_id" text;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "application_keys" ADD CONSTRAINT "application_keys_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_events" ADD CONSTRAINT "intake_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_applications" ADD CONSTRAINT "user_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_applications" ADD CONSTRAINT "user_applications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_events_app_key_uq" ON "intake_events" USING btree ("application_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "intake_events_created_idx" ON "intake_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_due_idx" ON "webhook_deliveries" USING btree ("delivered_at","next_attempt_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_app_created_idx" ON "leads" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_app_external_uq" ON "leads" USING btree ("application_id","external_id") WHERE external_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_app_name_uq" ON "pipeline_stages" USING btree ("application_id","name");--> statement-breakpoint
-- Existing data belongs to Avrix UK & Europe: create it and tag every existing row.
INSERT INTO "applications" ("id", "key", "name", "domain", "color", "data_class", "sort_order")
VALUES ('app-avrix-europe', 'avrix-europe', 'Avrix UK & Europe', 'avrix-europe.com', '#3563f2', 'BUSINESS', 1)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
UPDATE "pipeline_stages" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "leads" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "contacts" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "campaigns" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "lists" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "templates" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "bookings" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "import_jobs" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
UPDATE "email_messages" SET "application_id" = 'app-avrix-europe' WHERE "application_id" IS NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ALTER COLUMN "application_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "application_id" SET NOT NULL;--> statement-breakpoint
-- The other Avrix applications and their pipelines (production is seeded only once, so they live here).
INSERT INTO "applications" ("id","key","name","domain","color","data_class","campaigns_allowed","sort_order","record_url_template") VALUES ('app-avrix-digital','avrix-digital','AVRIX Digital','avrixdigital.co.uk','#db2777','BUSINESS',true,2,'https://avrixdigital.co.uk/manage-7f3k/enquiries/enquiry/{id}/change/') ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s1', a."id", 'New', 1, '#3563f2', false, false FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s2', a."id", 'Contacted', 2, '#0ea5e9', false, false FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s3', a."id", 'Qualified', 3, '#8b5cf6', false, false FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s4', a."id", 'Proposal sent', 4, '#f97316', false, false FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s5', a."id", 'Won', 5, '#16a34a', true, false FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s6', a."id", 'Lost', 6, '#9ca3af', false, true FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-avrix-digital-s7', a."id", 'Spam', 7, '#6b7280', false, true FROM "applications" a WHERE a."key" = 'avrix-digital' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "applications" ("id","key","name","domain","color","data_class","campaigns_allowed","sort_order","record_url_template") VALUES ('app-medicolex','medicolex','Medicolex','medicolex.co.uk','#0891b2','HEALTH',false,3,NULL) ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-medicolex-s1', a."id", 'New instruction', 1, '#3563f2', false, false FROM "applications" a WHERE a."key" = 'medicolex' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-medicolex-s2', a."id", 'Acknowledged', 2, '#0ea5e9', false, false FROM "applications" a WHERE a."key" = 'medicolex' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-medicolex-s3', a."id", 'Appointment booked', 3, '#f59e0b', false, false FROM "applications" a WHERE a."key" = 'medicolex' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-medicolex-s4', a."id", 'Report sent', 4, '#16a34a', true, false FROM "applications" a WHERE a."key" = 'medicolex' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-medicolex-s5', a."id", 'Declined', 5, '#9ca3af', false, true FROM "applications" a WHERE a."key" = 'medicolex' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "applications" ("id","key","name","domain","color","data_class","campaigns_allowed","sort_order","record_url_template") VALUES ('app-seuk','seuk','Shoulder Elbow Consultant','shoulderelbowconsultant.co.uk','#15803d','HEALTH',false,4,NULL) ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-seuk-s1', a."id", 'New enquiry', 1, '#3563f2', false, false FROM "applications" a WHERE a."key" = 'seuk' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-seuk-s2', a."id", 'Contacted', 2, '#0ea5e9', false, false FROM "applications" a WHERE a."key" = 'seuk' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-seuk-s3', a."id", 'Appointment booked', 3, '#f59e0b', false, false FROM "applications" a WHERE a."key" = 'seuk' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-seuk-s4', a."id", 'Seen', 4, '#16a34a', true, false FROM "applications" a WHERE a."key" = 'seuk' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-seuk-s5', a."id", 'Not proceeding', 5, '#9ca3af', false, true FROM "applications" a WHERE a."key" = 'seuk' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "applications" ("id","key","name","domain","color","data_class","campaigns_allowed","sort_order","record_url_template") VALUES ('app-growth-suite','growth-suite','Growth Suite',NULL,'#7c3aed','BUSINESS',true,5,NULL) ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s1', a."id", 'New', 1, '#3563f2', false, false FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s2', a."id", 'Contacted', 2, '#0ea5e9', false, false FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s3', a."id", 'Qualified', 3, '#8b5cf6', false, false FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s4', a."id", 'Proposal sent', 4, '#f97316', false, false FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s5', a."id", 'Won', 5, '#16a34a', true, false FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-growth-suite-s6', a."id", 'Lost', 6, '#9ca3af', false, true FROM "applications" a WHERE a."key" = 'growth-suite' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "applications" ("id","key","name","domain","color","data_class","campaigns_allowed","sort_order","record_url_template") VALUES ('app-atlis-crm','atlis-crm','atlis.cloud CRM','atlis.cloud','#b45309','BUSINESS',true,6,NULL) ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s1', a."id", 'New', 1, '#3563f2', false, false FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s2', a."id", 'Contacted', 2, '#0ea5e9', false, false FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s3', a."id", 'Qualified', 3, '#8b5cf6', false, false FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s4', a."id", 'Proposal sent', 4, '#f97316', false, false FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s5', a."id", 'Won', 5, '#16a34a', true, false FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "pipeline_stages" ("id","application_id","name","order","color","is_won","is_lost") SELECT 'app-atlis-crm-s6', a."id", 'Lost', 6, '#9ca3af', false, true FROM "applications" a WHERE a."key" = 'atlis-crm' ON CONFLICT DO NOTHING;
