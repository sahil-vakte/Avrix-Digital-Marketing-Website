# Deploying to a VPS (Ubuntu 24.04)

Recommended size: 2 vCPU, 4 GB RAM, 50 GB SSD (e.g. Hostinger KVM 2). One server runs everything: Nginx → Next.js (port 3000), the worker, and PostgreSQL.

## 1. Prepare the server (once)

```bash
ssh root@YOUR_SERVER_IP
adduser avrix && usermod -aG sudo avrix      # optional: non-root deploy user
# upload the project (scp/rsync/git) to /var/www/avrix-europe, then:
cd /var/www/avrix-europe
sudo bash deploy/setup-ubuntu.sh             # Node 22, PM2, Nginx, PostgreSQL, firewall
```

The script prints a `DATABASE_URL` with a random password. Keep it for the next step.

## 2. Configure

```bash
cp .env.example .env
nano .env
```

Fill in at least:

* `APP_URL`: the public `https://` address. It is used in tracking and unsubscribe links, so it must be correct before you send.
* `DATABASE_URL`: from step 1.
* `AUTH_SECRET`, `ENCRYPTION_KEY`, `IP_HASH_SALT`: generate each with `openssl rand -hex 32`.
* `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ALERT_EMAIL`.
* `SMTP_*`, `MAIL_*`, `GOOGLE_AUTH_MODE`, `SMTP_PASS` or the service-account values, and `IMAP_*`.
* `COMPANY_LEGAL_NAME`, `COMPANY_POSTAL_ADDRESS`, `COMPANY_PHONE`, `COMPANY_WHATSAPP`. These are required in every email footer.
* Optional: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`.

```bash
chmod 600 .env
```

## 3. Install, migrate, build, start

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup        # follow the printed command so both processes restart on reboot
```

Check: `curl localhost:3000/api/health` → `{"ok":true,…}` and `pm2 logs avrix-worker`.

## 4. Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/avrix-europe
sudo nano /etc/nginx/sites-available/avrix-europe     # set your domain
sudo ln -s /etc/nginx/sites-available/avrix-europe /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d avrix-europe.com -d www.avrix-europe.com
```

## 5. Backups

```bash
sudo mkdir -p /var/backups/avrix && sudo chown avrix /var/backups/avrix
crontab -e
# 15 2 * * * /var/www/avrix-europe/deploy/backup.sh >> /var/log/avrix-backup.log 2>&1
```

Copy backups off the server (see the comment in `deploy/backup.sh`). Test a restore once before going live:
`gunzip -c avrix-YYYYMMDD.sql.gz | psql "$DATABASE_URL"` against a scratch database.

## 6. Go-live checklist

- [ ] `APP_URL` is the live https address
- [ ] Admin password changed and 2FA set up for every admin
- [ ] *Settings → Test SMTP login* succeeds
- [ ] SPF, DKIM and DMARC are green in *Settings*
- [ ] IMAP enabled for the mailbox; *Settings* shows "last check" updating every few minutes
- [ ] Test campaign sent to 5–10 internal addresses (Gmail, Outlook, Apple Mail): opens, clicks, reply and unsubscribe all show in the report
- [ ] Legal pages (privacy, cookies, terms) completed with company number and ICO registration
- [ ] Country rules reviewed for every target market
- [ ] Backups running and a restore tested
- [ ] Uptime monitor on `https://YOUR_DOMAIN/api/health`

## Updating

```bash
cd /var/www/avrix-europe
# upload new files / git pull
npm ci && npm run db:migrate && npm run build
pm2 restart all
```

The worker finishes the email it is sending before it stops. Anything left half-sent is requeued on start-up.

## Changing settings

* Values in `.env` (caps, SMTP, company details) → edit, then `pm2 restart all`. Company details shown on the static service pages need `npm run build` too.
* Booking availability, compliance rules, country rules, pipeline stages, users, pricing, FAQs, blog and case studies → in the admin panel, with no restart needed.
