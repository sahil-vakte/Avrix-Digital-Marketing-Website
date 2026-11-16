#!/usr/bin/env bash
# One-time VPS preparation (Ubuntu 24.04). Run as root: bash deploy/setup-ubuntu.sh
set -euo pipefail
apt-get update
apt-get install -y curl git nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
DBPASS=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER avrix WITH PASSWORD '$DBPASS';" || true
sudo -u postgres psql -c "CREATE DATABASE avrix OWNER avrix;" || true
echo
echo "PostgreSQL ready. Put this in .env:"
echo "DATABASE_URL=postgresql://avrix:$DBPASS@localhost:5432/avrix"
