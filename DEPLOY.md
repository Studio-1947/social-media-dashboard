# Deploying Social Flow to the Hostinger VPS

Production target: **https://s47-social-flow.duckdns.org**, VPS at `187.127.185.82`.

Architecture, end to end:

```
GitHub push to main
  -> GitHub Actions builds server + client images (server/Dockerfile, client/Dockerfile, both `prod` target)
  -> pushes both to ghcr.io/studio-1947/social-media-dashboard-{server,client}
  -> SSHes into the VPS, syncs deploy/, runs `docker compose pull && up -d`

On the VPS (deploy/docker-compose.deploy.yml):
  proxy (nginx, :80/:443, TLS)  ->  client (nginx, SPA + /api proxy)  ->  server (:5000)  ->  db (Postgres)
  certbot   — renews the cert every 12h
  duckdns   — re-pings DuckDNS every 5 min so the domain keeps pointing here
```

This reuses the existing `server/Dockerfile` and `client/Dockerfile` unchanged
— same images as `docker-compose.prod.yml`, just built by CI instead of
locally and pulled instead of built on the VPS. See [DOCKER.md](DOCKER.md) for
what those images actually contain.

## 1. One-time VPS setup

SSH into the VPS as a sudo-capable user, then:

```bash
# Docker + compose plugin (Ubuntu/Debian; Hostinger's default VPS image)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in once for this to take effect

# Firewall — only 22 (SSH), 80 and 443 (nginx/ACME) need to be open
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

sudo mkdir -p /opt/social-flow
sudo chown "$USER":"$USER" /opt/social-flow
```

Copy `deploy/docker-compose.deploy.yml`, `deploy/nginx/app.conf`, and
`deploy/init-letsencrypt.sh` into `/opt/social-flow` (matching the layout the
CI workflow syncs into — `docker-compose.deploy.yml` and `init-letsencrypt.sh`
at the root, `nginx/app.conf` in a subfolder). Easiest is one `scp` from your
machine:

```bash
scp deploy/docker-compose.deploy.yml deploy/init-letsencrypt.sh you@187.127.185.82:/opt/social-flow/
scp deploy/nginx/app.conf you@187.127.185.82:/opt/social-flow/nginx/app.conf   # mkdir nginx/ first
```

After this, CI keeps these three files in sync automatically on every deploy
— you only do this copy once, to bootstrap.

### Create `/opt/social-flow/.env`

Not tracked in git (matches `server/.env` in the dev/prod stacks). Create it
on the VPS directly:

```bash
cat > /opt/social-flow/.env <<'EOF'
POSTGRES_PASSWORD=<generate a long random string>
JWT_SECRET=<generate a long random string>
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=<a real password — change it after first login>

METRICOOL_BASE_URL=https://app.metricool.com
METRICOOL_API_TOKEN=<from Metricool Settings -> API>
METRICOOL_USER_ID=<your numeric Metricool user id>
METRICOOL_BLOG_ID=<default numeric blog id>
METRICOOL_DEFAULT_TIMEZONE=Asia/Kolkata

# Same-origin in this deploy (browser only ever talks to the nginx proxy), so
# this mostly doesn't matter for CORS — set it anyway for consistency.
FRONTEND_URLS=https://s47-social-flow.duckdns.org

DUCKDNS_TOKEN=66f88ed9-e304-4971-b4f5-2afbb4b2d7ca
EOF
chmod 600 /opt/social-flow/.env
```

Generate the two random secrets with `openssl rand -base64 32`.

> The DuckDNS token above is the one already used to point
> `s47-social-flow.duckdns.org` at `187.127.185.82`. Treat it like a password
> — anyone with it can repoint your subdomain.

### Issue the first TLS certificate

```bash
cd /opt/social-flow
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

Enter an email when prompted (used only for Let's Encrypt expiry notices).
This starts the `proxy` container with a throwaway self-signed cert, requests
the real one from Let's Encrypt over the HTTP-01 challenge, and reloads nginx.
Takes under a minute. Full explanation of why this two-step dance is needed is
in the script's header comment.

Then bring up everything else:

```bash
docker compose -f docker-compose.deploy.yml up -d
```

First boot pulls `db`/`certbot`/`duckdns` images but the `server`/`client`
images won't exist yet until the GitHub Actions workflow has pushed them at
least once — see the next section.

## 2. GitHub repo secrets

Settings -> Secrets and variables -> Actions, add:

| Secret | Value |
|---|---|
| `VPS_HOST` | `187.127.185.82` |
| `VPS_USER` | the SSH user you set up in step 1 |
| `VPS_SSH_KEY` | private key for a **deploy-only** SSH keypair (generate with `ssh-keygen -t ed25519 -f deploy_key -N ""`; put `deploy_key.pub` in the VPS user's `~/.ssh/authorized_keys`, paste `deploy_key` — the private half — here) |
| `VPS_SSH_PORT` | `22` (or whatever you changed it to) |
| `GHCR_USERNAME` | your GitHub username |
| `GHCR_PAT` | a classic PAT with only the `read:packages` scope — used by the VPS to `docker login ghcr.io` and pull. `GITHUB_TOKEN` can't be used here since it's scoped to the Actions run, not usable from an external SSH session. |

`GITHUB_TOKEN` (automatic, no setup needed) is what the build job itself uses
to *push* images — only the VPS-side pull needs the PAT above.

If you'd rather skip the PAT entirely: after the first push, go to the
package's GitHub page (org -> Packages -> `social-media-dashboard-server` /
`-client`) and set visibility to Public. Then `docker login` on the VPS is
unnecessary and that SSH step can be deleted from the workflow. Given this is
a client-facing dashboard, keeping the packages private (PAT approach) is the
safer default — the workflow as committed assumes that.

The workflow also references a `production` GitHub Environment (for a visible
deploy history / optional future protection rules) — create one under
Settings -> Environments if it doesn't already exist, or remove the
`environment: production` line from `.github/workflows/deploy.yml` if you'd
rather not bother.

## 3. Ship it

```bash
git push origin main
```

Watch it run under the repo's Actions tab. On success:

```bash
curl -I https://s47-social-flow.duckdns.org/health
```

should return `200` (or `503` if Metricool/DB creds are wrong — check
`docker compose -f docker-compose.deploy.yml logs server` on the VPS, same as
the [DOCKER.md](DOCKER.md) "Verifying it's actually working" section).

Every subsequent push to `main` rebuilds both images and redeploys
automatically — no manual VPS steps after the one-time setup above.

## Notes

- **Cert renewal** is automatic (`certbot` container, every 12h;
  `proxy` reloads nginx every 6h to pick up renewed certs) — nothing to do.
- **DuckDNS** re-pings every 5 min from the `duckdns` container. Hostinger VPS
  IPs are static in practice, so this is insurance against the rare
  reprovision/migration, not something you should expect to ever matter.
- **Rolling back** a bad deploy: re-run the workflow for an older commit
  (Actions tab -> select the run -> "Re-run all jobs"), or manually on the VPS:
  `docker compose -f docker-compose.deploy.yml pull` after retagging — simplest
  is just `git revert` the bad commit and push, letting CI redeploy forward.
- **Database backups** aren't set up here — `socialflow_pgdata_prod` is a
  named Docker volume on the VPS with no automated offsite backup. Worth
  adding (e.g. a nightly `pg_dump` cron to S3/Backblaze) before this holds
  data you can't afford to lose.
