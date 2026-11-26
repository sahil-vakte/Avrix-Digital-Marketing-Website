# Unified CRM: applications and the intake API

This CRM now holds the leads of every Avrix application. Each lead, contact, list, template, campaign,
booking and pipeline stage belongs to one **application**. Pick one in the sidebar **Application** switcher,
or choose **All applications** to see everything together (dashboard per application, boards grouped by
application, tables sortable and filterable by application).

| Application (key) | Data type | Pipeline | How it connects |
| --- | --- | --- | --- |
| Avrix UK & Europe (`avrix-europe`) | Business | New → Contacted → Replied → Meeting booked → Proposal sent → Won / Lost | Native (this site's contact and booking forms) |
| AVRIX Digital (`avrix-digital`) | Business | New → Contacted → Qualified → Proposal sent → Won / Lost / Spam | Django `sync_to_crm` command + status webhook |
| Medicolex (`medicolex`) | Health | New instruction → Acknowledged → Appointment booked → Report sent / Declined | Form forwarder posts each submission |
| Shoulder Elbow Consultant (`seuk`) | Health | New enquiry → Contacted → Appointment booked → Seen / Not proceeding | Enquiry route posts each submission |
| Growth Suite (`growth-suite`) | Business | New → Contacted → Qualified → Proposal sent → Won / Lost | Job queue (`crm.sync`) on create, merge and stage change |
| atlis.cloud CRM (`atlis-crm`) | Business | as Growth Suite | `/api/cron/crm-sync` every 15 minutes (prospects only) |

Add more in **Admin → Applications** (any number; each gets its own pipeline, key, sender and staff access).

## Upgrade steps

```bash
npm install
npm run db:migrate     # adds applications; tags every existing record as Avrix UK & Europe
npm run db:seed        # adds the other five applications and their pipelines (safe to re-run)
npm run build && pm2 restart all
```

Then for each application: **Admin → Applications → Manage → Generate key**, copy the three values shown
once into that application's environment file, and deploy it:

```
AVRIX_CRM_URL=https://<this CRM's domain>
AVRIX_CRM_KEY=avx_…
AVRIX_CRM_SECRET=whsec_…
```

| Application | Where | Extra step |
| --- | --- | --- |
| avrix-website | `backend/.env` | `python manage.py migrate`, then run `python manage.py sync_to_crm` every minute (cron/systemd timer, like `send_pending_emails`). The first run back-fills existing enquiries. For status updates back into Django admin: in the CRM set the webhook URL to `https://<api host>/api/crm-webhook/`, press **Generate secret**, and put it in `AVRIX_CRM_WEBHOOK_SECRET`. |
| medicolex-web | `.env.local` / server env | Keeps `FORM_WEBHOOK_URL` for documents. The CRM receives a minimal record (no documents, date of birth, postcode or injury description). |
| shoulder-elbow-consultant-website | `.env.local` / server env | Resend email stays as a backup alert. |
| growth-suite | `.env` | Worker or `/api/cron/tick` must be running. Optional `AVRIX_CRM_SITE_KEYS` sends a client site to its own CRM application; `AVRIX_CRM_SITES` limits which sites sync. |
| atlis-cloud | `.env.local` | Call `/api/cron/crm-sync` with `x-cron-key` every 15 minutes. Add `?force=1` once to back-fill all prospects. |

## Access rules

* Administrators see every application.
* Staff see the applications ticked for them in **Settings → Users**. Staff with nothing ticked see business
  applications only. **Health applications are never visible to staff unless ticked explicitly.**
* Health applications: no contacts are created, nothing enters lists or campaigns, campaigns are switched off,
  and alert emails contain only a link (no personal details).

## API reference

`POST /api/intake/leads` — create or update a lead.

Headers:

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <AVRIX_CRM_KEY>` |
| `X-Avrix-Timestamp` | Unix time in seconds (must be within 5 minutes) |
| `X-Avrix-Signature` | `sha256=` + hex HMAC-SHA256 of `"<timestamp>.<raw body>"` with `AVRIX_CRM_SECRET` |
| `Idempotency-Key` | Unique per submission; retries with the same key return the same lead |

Body (JSON, all optional except an email **or** phone):

```json
{
  "externalId": "123", "externalUrl": "https://…/admin/enquiry/123",
  "name": "Jane Smith", "firstName": "Jane", "lastName": "Smith",
  "email": "jane@example.com", "phone": "+44 7700 900123",
  "businessName": "Example Ltd", "country": "GB",
  "service": "GA4 consulting", "budget": "1k-3k", "message": "…",
  "stage": "New", "source": "website_form", "priority": "normal",
  "value": 2500, "currency": "GBP", "tags": ["inbound"],
  "attribution": { "utm_source": "google", "gclid": "…" },
  "customFields": { "clinic": "Leicester" },
  "consent": { "marketing": true, "text": "Ticked the newsletter box" },
  "attachments": [{ "name": "records.pdf", "size": 120400 }],
  "occurredAt": "2026-11-26T09:00:00Z", "note": "Internal note"
}
```

Matching: same `externalId` in the same application → update; otherwise same email (or phone when there is no
email) in the same application → merged into the existing lead; otherwise a new lead. Values typed in the CRM are
never overwritten. Responses: `201 {leadId, outcome:"created"}`, `200` for `updated` / `merged` / `duplicate`,
`401` bad key or signature, `422` invalid body.

`POST /api/intake/status` — `{ "externalId": "123", "stage": "Won", "priority": "high", "note": "…" }`.

**Outbound webhook.** When someone moves a lead to another stage in the CRM and its application has a webhook URL,
the worker POSTs (signed the same way, with that application's webhook secret, retried with back-off up to 8 times):

```json
{ "event": "lead.stage_changed", "application": "avrix-digital", "externalId": "123", "leadId": "…",
  "stage": "Proposal sent", "isWon": false, "isLost": false, "priority": "normal", "actor": "AB", "at": "…" }
```

## Sending email per application

Each application can have its own From name/address, reply-to and footer (legal name, postal address), and
optionally its own SMTP mailbox (Applications → Details). Without its own mailbox, mail goes through the default
`.env` account using the application's From address, which must be a verified "Send mail as" alias there.
Reply and bounce tracking (IMAP) reads the default mailbox only.
