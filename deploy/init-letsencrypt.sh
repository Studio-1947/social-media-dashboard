#!/usr/bin/env bash
# One-time bootstrap: gets the FIRST real Let's Encrypt cert for
# s47-social-flow.duckdns.org. Run this once, by hand, on the VPS, from this
# directory (deploy/) — never from CI. After this succeeds, the `certbot`
# service in docker-compose.deploy.yml renews automatically forever and
# nothing here needs to run again.
#
# Why this dance: the proxy's 443 server block (nginx/app.conf) references
# cert files that don't exist on a fresh VPS. nginx refuses to even start with
# a missing ssl_certificate path, but certbot needs nginx running on port 80 to
# answer the HTTP-01 challenge. So: write a throwaway self-signed cert to the
# same path first (nginx starts fine, TLS is briefly "invalid" — nobody hits it
# yet since DNS + CI aren't pointed here during bootstrap), swap it for the
# real one, then reload.
set -euo pipefail

DOMAIN="s47-social-flow.duckdns.org"

read -rp "Email for Let's Encrypt renewal notices: " LETSENCRYPT_EMAIL

if [ ! -f ./.env ]; then
  echo "deploy/.env not found — create it first (see ../DEPLOY.md for the full list of variables)." >&2
  exit 1
fi

echo "==> Creating a throwaway self-signed cert so nginx can start..."
docker compose -f docker-compose.deploy.yml run --rm --entrypoint /bin/sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'"

echo "==> Starting the proxy with the dummy cert..."
docker compose -f docker-compose.deploy.yml up -d proxy

echo "==> Deleting the dummy cert..."
docker compose -f docker-compose.deploy.yml run --rm --entrypoint /bin/sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

echo "==> Requesting the real certificate from Let's Encrypt..."
docker compose -f docker-compose.deploy.yml run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN" --rsa-key-size 2048

echo "==> Reloading nginx with the real certificate..."
docker compose -f docker-compose.deploy.yml exec proxy nginx -s reload

echo "==> Done. https://$DOMAIN should now serve a valid certificate."
echo "==> Bring up the rest of the stack with:"
echo "    docker compose -f docker-compose.deploy.yml up -d"
