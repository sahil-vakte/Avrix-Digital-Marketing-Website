# Current production deployment

Website: http://92.205.160.39

Admin: http://92.205.160.39/admin/login

The existing `avrixdigital.co.uk` and `wims.cloud` sites have separate Nginx
configurations and services. Do not run `deploy/setup-ubuntu.sh` on this shared
server: the marketing application's isolated setup is already installed.

## Automatic releases

Push changes to `main` in this repository. The **Production deployment** workflow
installs dependencies, type-checks, tests, migrates a temporary CI database, builds
on GitHub's Ubuntu runner, and uploads a Linux production release. No Next.js build
runs on the VPS. View progress in the repository's **Actions** tab. The workflow
also supports **Run workflow** for manual redeployment.

GitHub Actions secrets `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` are configured.
The deployment key only invokes the application deployment command; it does not
provide a general SSH shell. Production application credentials stay on the VPS,
outside releases and outside Git. They are not uploaded to GitHub.

Deployments are serialized. The previous release is kept; if the new application's
health check fails, its code is restored automatically. Database migrations are
not automatically reversed, so future migrations must remain compatible with the
previous release. A database backup is saved before subsequent deployments.

## Server layout

- Application account: `avrixmarketing`
- Runtime: dedicated Node.js 22 under `/opt/avrix-marketing/node`
- Releases: `/opt/avrix-marketing/releases`
- Active release: `/opt/avrix-marketing/current`
- Credentials: `/opt/avrix-marketing/shared/.env` (mode 600)
- Uploads: `/opt/avrix-marketing/shared/uploads`
- Pre-deployment database backups: `/opt/avrix-marketing/shared/backups`
- PostgreSQL database and role: `avrix_marketing`, existing PostgreSQL port 5433
- Web listener: `127.0.0.1:3010`, exposed through Nginx on port 80
- Services: `avrix-marketing-web`, `avrix-marketing-worker`
- Shared resource budget: 60% of one CPU, 800 MB RAM maximum, 256 MB swap maximum

Only this application's two services restart during releases. The deployment
retains three recent release directories and pre-deployment backups for 14 days.
These backups are local; arrange off-server backups for important production data.

```bash
sudo systemctl status avrix-marketing-web avrix-marketing-worker
sudo journalctl -u avrix-marketing-web -u avrix-marketing-worker -n 100
curl -f http://127.0.0.1:3010/api/health
sudo cat /opt/avrix-marketing/current/REVISION
```

Production SMTP uses the configured mailbox, but the supplied Google password was
rejected. Set a valid Google app password in `SMTP_PASS` and `IMAP_PASS`, then set
`IMAP_ENABLED=true` and restart both marketing services. IMAP monitoring is
currently disabled to avoid repeated failed logins. HTTP on the IP has no TLS;
configure the subdomain and HTTPS before using sensitive admin data.

## Add the subdomain later

1. Add an A record: `marketing` -> `92.205.160.39` in the DNS zone for
   `avrixdigital.co.uk`. The main domain and WIMS records stay unchanged.
2. Once DNS resolves, issue a certificate for `marketing.avrixdigital.co.uk` and
   enable HTTPS in this application's Nginx configuration only.
3. Change the server `.env` value `APP_URL` to
   `https://marketing.avrixdigital.co.uk` and set the repository Actions variable
   `APP_URL` to the same URL.
4. Run the production workflow again so built metadata and runtime settings match.

Files in `deploy/` describe the installed server configuration. Changing those
files alone does not reinstall systemd/Nginx or the root-owned deployment script;
apply infrastructure changes separately after reviewing their effects.
