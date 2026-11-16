# Avrix UK & Europe — Website, CRM & Email Campaign Platform

One Next.js application for **Avrix UK & Europe Business Marketing** (part of Avrix Digital):

| Part | What it does |
| --- | --- |
| **Public website** | Long-scroll home page, 6 service pages, pricing (GBP/EUR), case studies, blog, contact form, call booking, WhatsApp button, cookie consent, SEO (sitemap, schema.org, metadata) |
| **Admin panel** (`/admin`) | Login with 2FA, dashboard, leads pipeline (Kanban + table), contacts, CSV/Excel/PDF import, lists & segments, suppression list, templates, campaigns, bookings, website content editor, settings, users, audit log |
| **Campaign engine** | Personalised emails sent one by one through **your own SMTP account from `.env`** (Google Workspace by default), with A/B subjects, up to 3 threaded follow-ups, send windows, daily/hourly caps, warm-up, open/click/reply/bounce/unsubscribe tracking |
| **Worker** (`npm run worker`) | Always-on process that sends the queue, picks A/B winners, completes campaigns and reads the mailbox over IMAP for bounces and replies |

No third-party email service is used: mail goes out through the SMTP login in `.env`, and replies and bounces are read back from the same mailbox over IMAP.

---

## Quick start (local)

Requirements: Node.js 22, PostgreSQL 14+.

```bash
cp .env.example .env            # then edit the values
npm install
npm run db:migrate              # creates the tables
npm run db:seed                 # first admin user, pipeline stages, country rules, sample content
npm run dev                     # website on http://localhost:3000, admin on /admin
npm run worker                  # in a second terminal — sends email and monitors the mailbox
```

Sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. Administrators must set up two-factor authentication (Google Authenticator, 1Password, etc.) at first sign-in. Change the seeded password straight away in **Account security**.

Production deployment on a VPS: see **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## Sending email with Google Workspace

1. Create a **separate Workspace user on a separate outreach domain** (e.g. `outreach@avrix-europe.com`). Never send cold campaigns from your main business mailbox. Google's acceptable-use policy prohibits unsolicited bulk email, and a suspension stops all mail on that account.
2. Authenticate the domain: **SPF** (`v=spf1 include:_spf.google.com ~all`), **DKIM** (Google Admin → Apps → Gmail → Authenticate email) and **DMARC** (`_dmarc` TXT `v=DMARC1; p=none; rua=mailto:…`). *Admin → Settings* checks all three for you.
3. Choose an authentication method in `.env`:
   * **App password** (simplest): turn on 2-Step Verification for the user, create an app password, and set `GOOGLE_AUTH_MODE=app_password`, `SMTP_PASS=` and `IMAP_PASS=` to it.
   * **OAuth 2.0** (recommended): create a Google Cloud service account with domain-wide delegation for scope `https://mail.google.com/`, then set `GOOGLE_AUTH_MODE=oauth2`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_KEY`.
4. In Gmail settings for that user, make sure **IMAP is enabled** (needed for bounce and reply detection).
5. Set the limits. Google allows 2,000 messages a day per paid user (500 on a trial). Defaults: `SEND_DAILY_CAP=1000`, `SEND_HOURLY_CAP=150`, 30–120 seconds between emails, and a warm-up ramp of 20 → 40 → 80 → 150 → 300 → 500 → 800 a day over the first week.

*Admin → Settings → Test SMTP login* confirms the credentials work. To use a different provider later, change `SMTP_*` / `IMAP_*` in `.env`; no code changes are needed.

---

## How a campaign works

1. **Import contacts** (*Admin → Import*). CSV, Excel or PDF. Columns are auto-mapped, every row can be corrected before import, and each email is checked for syntax, disposable domains, role addresses and a mail server (MX). Duplicates and suppressed addresses are skipped.
2. **Build the audience** from static lists and/or segments (saved filters by country, business type, consent, tags, "not emailed in N days").
3. **Write the email** in the rich-text editor with merge tags (`{{first_name|there}}`, `{{business_name}}`, `{{custom.anything}}`). There is a deliverability check, a live preview as any contact, and a test send. Optionally add an A/B subject and up to 3 follow-ups.
4. **Schedule.** Send now or at a UK time, inside a send window (days and hours, in each recipient's own time zone).
5. **Launch.** The system creates one queued email per eligible recipient. The worker sends them one at a time within the caps.
6. **Track.** Each recipient has a timeline: sent → opened (every open, with time) → clicked (which link) → replied (text captured, lead created in the CRM, follow-ups stopped) → bounced / unsubscribed.

### Compliance built in

* **UK PECR:** limited companies and LLPs (corporate subscribers) can be emailed without consent. Sole traders and non-LLP partnerships (individual subscribers) are excluded unless they opted in. Unknown business types are excluded by default (configurable).
* **EU:** per-country "consent required" rules (*Settings → Country rules*). Conservative defaults are set for Germany, Austria, Italy, Spain, Poland and others. Review these with your legal adviser.
* Every campaign email carries a visible unsubscribe link, RFC 8058 one-click `List-Unsubscribe` headers, and your company name and postal address.
* Global **suppression list** (unsubscribes, hard bounces, complaints, manual blocks, erased people), checked at import, at launch and again immediately before each send.
* Auto-pause when a campaign's bounce rate passes 3%. Emergency "pause all sending" switch.
* GDPR tools: lawful basis and source recorded per contact, subject-access export (JSON), erasure (deletes the data and keeps the address suppressed), retention flag for contacts with no engagement, full audit log.

*This software helps you follow the rules, but it is not legal advice. Confirm your approach for each target country with a qualified adviser.*

---

## Project structure

```
src/app/(site)/          Public website pages
src/app/admin/           Admin login, panel pages, server actions, CSV exports
src/app/api/             Contact form, booking, one-click unsubscribe, health check
src/app/t/o|c/[token]    Open pixel and click redirect
src/content/site.ts      Website copy (services, pillars, FAQs on service pages…)
src/db/schema.ts         Database schema (Drizzle ORM, PostgreSQL)
src/lib/                 Auth, mailer, rendering, compliance, import parsing, tracking…
worker/                  Sending worker, campaign scheduler, IMAP monitor
drizzle/                 SQL migrations
scripts/                 migrate, seed
deploy/                  Nginx config, PM2 process file, backups, Ubuntu setup
tests/                   Unit tests (npm test)
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run build` / `npm start` | Production build / start the website |
| `npm run worker` | Start the sending worker |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:generate` | Create a new migration after editing `src/db/schema.ts` |
| `npm run db:seed` | Seed admin user and defaults (safe to re-run) |
| `npm test` / `npm run typecheck` | Unit tests / TypeScript check |
| `curl localhost:3000/api/health` | Database and worker health (for uptime monitoring) |

## Notes on technical choices

* **Drizzle ORM** instead of Prisma. It is pure JavaScript, so there are no engine binaries to download on the server, and migrations are plain SQL.
* **PostgreSQL-backed queue** instead of Redis/BullMQ. With a single mailbox the throughput is tiny, and keeping the queue in Postgres means one fewer service to run and back up. Messages are claimed atomically, so nothing is sent twice, and the queue survives restarts.
* **Session cookies signed with `AUTH_SECRET`** (JWT, 8 hours) plus TOTP 2FA, rather than a third-party auth library.
