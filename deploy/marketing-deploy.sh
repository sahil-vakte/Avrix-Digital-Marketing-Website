#!/usr/bin/env bash
# Installed root-owned at /usr/local/sbin/avrix-marketing-deploy.
# The restricted CI SSH key streams a Linux release tarball to stdin.
set -euo pipefail
umask 027
ROOT=/opt/avrix-marketing
exec 9>/run/lock/avrix-marketing-deploy.lock
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
release="$ROOT/releases/$(date -u +%Y%m%dT%H%M%S)-$RANDOM"
previous=$(readlink -f "$ROOT/current" || true)
install -d -o avrixmarketing -g avrixmarketing -m 750 "$release"
echo 'Receiving prebuilt release'
runuser -u avrixmarketing -- nice -n 15 ionice -c 3 tar --no-same-owner -xzf - -C "$release"
test -f "$release/.next/BUILD_ID"
test -f "$release/node_modules/next/dist/bin/next"
test -f "$release/REVISION"
ln -s "$ROOT/shared/.env" "$release/.env"
ln -s "$ROOT/shared/uploads" "$release/uploads"
export PATH="$ROOT/node/bin:/usr/sbin:/usr/bin:/sbin:/bin"
if [[ -n "$previous" && -d "$previous" ]]; then
  echo 'Backing up this application database before migration'
  runuser -u avrixmarketing -- node --env-file="$ROOT/shared/.env" -e '
    const fs = require("node:fs");
    const { spawnSync } = require("node:child_process");
    const database = new URL(process.env.DATABASE_URL);
    const output = fs.openSync(process.argv[1], "wx", 0o600);
    const result = spawnSync("pg_dump", ["-Fc"], {
      env: {
        ...process.env,
        PGHOST: database.hostname,
        PGPORT: database.port || "5432",
        PGUSER: decodeURIComponent(database.username),
        PGPASSWORD: decodeURIComponent(database.password),
        PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
      },
      stdio: ["ignore", output, 2],
    });
    fs.closeSync(output);
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  ' "$ROOT/shared/backups/$(date -u +%Y%m%dT%H%M%S).dump"
fi
echo 'Applying application migrations'
runuser -u avrixmarketing -- bash -c 'cd "$1"; export NODE_ENV=production; /opt/avrix-marketing/node/bin/node node_modules/tsx/dist/cli.mjs scripts/migrate.ts' -- "$release"
if [[ ! -f "$ROOT/shared/.seeded" ]]; then
  runuser -u avrixmarketing -- bash -c 'cd "$1"; export NODE_ENV=production; /opt/avrix-marketing/node/bin/node node_modules/tsx/dist/cli.mjs scripts/seed.ts' -- "$release"
  touch "$ROOT/shared/.seeded"
fi
rollback() {
  echo 'Health verification failed; restoring previous application release'
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "$ROOT/current.next"
    mv -Tf "$ROOT/current.next" "$ROOT/current"
    systemctl restart avrix-marketing-web avrix-marketing-worker
  else
    systemctl stop avrix-marketing-web avrix-marketing-worker
  fi
  echo 'Database migrations are not automatically reversed; the pre-migration backup is retained.'
}
ln -sfn "$release" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
if ! systemctl restart avrix-marketing-web avrix-marketing-worker; then rollback; exit 1; fi
healthy=false
for attempt in $(seq 1 30); do
  if curl --max-time 5 -fsS http://127.0.0.1:3010/api/health; then healthy=true; break; fi
  sleep 2
done
if [[ "$healthy" != true ]]; then rollback; exit 1; fi
echo
echo "Deployed $(cat "$release/REVISION")"
# Retain the current and previous release, plus the newest third release.
mapfile -t old_releases < <(find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +4)
for old in "${old_releases[@]}"; do
  [[ "$old" == "$release" || "$old" == "$previous" ]] && continue
  [[ "$(realpath "$old")" == "$ROOT/releases/"* ]] && rm -rf -- "$old"
done
find "$ROOT/shared/backups" -maxdepth 1 -type f -name '*.dump' -mtime +14 -delete
