# Deploying Social Flow to the Hostinger VPS

Production target: **https://s47-social-flow.duckdns.org**, VPS at `187.127.185.82`,
repo cloned on the VPS at `/var/www/social-media-dashboard`.

**This VPS is shared** — it also runs `task-tracker-s47`, `doptor-super-app-monorepo`,
and a gunicorn app, all behind a **host-level nginx** (not in Docker) already
bound to `:80`/`:443`. Everything below is designed to slot in next to those
without touching them: this stack claims no host ports other than one
loopback-only port, and Docker Compose namespaces its own network/volumes
under the project name `social-flow-deploy`, fully isolated from the other
projects' containers.

Architecture, end to end:

```
GitHub push to main
  -> GitHub Actions SSHes into the VPS: git fetch/reset the existing clone,
     `docker compose up -d --build`

On the VPS:
  host nginx (already running, :80/:443, fronts other sites too)
    -> new vhost for s47-social-flow.duckdns.org, TLS via host certbot
    -> proxy_pass to 127.0.0.1:8082

  docker compose project "social-flow-deploy" (deploy/docker-compose.deploy.yml):
    client (built from client/Dockerfile, 127.0.0.1:8082, nginx: SPA + /api proxy)
      -> server (built from server/Dockerfile, :5000, internal only)
      -> db (Postgres, internal only)
    duckdns — re-pings DuckDNS every 5 min so the domain keeps pointing here
```

No registry involved — CI's only job is to fast-forward the VPS's existing git
clone and re-run `docker compose up -d --build`, which compiles both images
directly on the VPS, same as running `docker compose -f docker-compose.prod.yml
up --build` locally would. This reuses the existing `server/Dockerfile` and
`client/Dockerfile` unchanged. See [DOCKER.md](DOCKER.md) for what those images
actually contain.

## 1. One-time VPS setup

You've already done the first part — cloning the repo:

```bash
cd /var/www
git clone git@github.com:Studio-1947/social-media-dashboard.git
```

Confirm Docker is available (it must be, since the other projects run in it):

```bash
docker compose version
```

### Create `deploy/.env`

Not tracked in git. Create it on the VPS:

```bash
cd /var/www/social-media-dashboard/deploy
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=CHANGE_ME_before_first_login

METRICOOL_BASE_URL=https://app.metricool.com
METRICOOL_API_TOKEN=CHANGE_ME
METRICOOL_USER_ID=CHANGE_ME
METRICOOL_BLOG_ID=CHANGE_ME
METRICOOL_DEFAULT_TIMEZONE=Asia/Kolkata

# Same-origin in this deploy (browser only ever talks to the host nginx), so
# this mostly doesn't matter for CORS — set it anyway for consistency.
FRONTEND_URLS=https://s47-social-flow.duckdns.org

DUCKDNS_TOKEN=66f88ed9-e304-4971-b4f5-2afbb4b2d7ca
EOF
chmod 600 .env
nano .env   # fill in ADMIN_EMAIL/ADMIN_PASSWORD/METRICOOL_* for real
```

> The DuckDNS token above is the one already used to point
> `s47-social-flow.duckdns.org` at `187.127.185.82`. Treat it like a password
> — anyone with it can repoint your subdomain.

### Add the host nginx vhost + TLS

This edits the **host's** nginx config (the one already fronting your other
sites) to add one more vhost — it does not touch any existing vhost file.

```bash
sudo cp /var/www/social-media-dashboard/deploy/nginx-host-vhost.conf.example \
    /etc/nginx/sites-available/s47-social-flow.duckdns.org.conf
sudo ln -s /etc/nginx/sites-available/s47-social-flow.duckdns.org.conf \
    /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` validates the config *before* reloading — if it fails, nothing
about your other sites changes; just fix the new file and retry.

Once that's live and `s47-social-flow.duckdns.org` resolves to this VPS
(it already does, per the DuckDNS update you ran), get the certificate:

```bash
sudo certbot --nginx -d s47-social-flow.duckdns.org
```

Since certbot is presumably already installed and renewing certs for your
other sites, check before assuming you need a new renewal timer:

```bash
systemctl list-timers | grep certbot
```

If that shows an existing timer, this new cert renews automatically alongside
the others — nothing further to configure.

### Bring up the app stack

```bash
cd /var/www/social-media-dashboard/deploy
docker compose -f docker-compose.deploy.yml up -d --build
```

First boot builds `server`/`client` from source (a minute or two — `npm ci` +
`tsc`/`vite build` for each) and pulls `db`/`duckdns` from Docker Hub.

## 2. GitHub repo secrets

Settings -> Secrets and variables -> Actions, add:

| Secret | Value |
|---|---|
| `VPS_HOST` | `187.127.185.82` |
| `VPS_USER` | the `deploy` user (or whichever user owns `/var/www/social-media-dashboard`) |
| `VPS_SSH_KEY` | private key for a **deploy-only** SSH keypair (generate with `ssh-keygen -t ed25519 -f deploy_key -N ""`; put `deploy_key.pub` in that user's `~/.ssh/authorized_keys`, paste `deploy_key` — the private half — here). This is separate from whatever key the `deploy` user already uses to `git clone`/`git pull` *from* GitHub — that direction doesn't change. |
| `VPS_SSH_PORT` | `22` (or whatever you changed it to) |

That's all four — no registry credentials needed since nothing gets pushed or
pulled from GHCR.

The workflow also references a `production` GitHub Environment (for a visible
deploy history / optional future protection rules) — create one under
Settings -> Environments if it doesn't already exist, or remove the
`environment: production` line from `.github/workflows/deploy.yml` if you'd
rather not bother.

## 3. Ship it

```bash
git push origin main
```

Watch it run under the repo's Actions tab. It fast-forwards the VPS's
existing clone (`git fetch && git reset --hard origin/main`), so don't
hand-edit anything inside `/var/www/social-media-dashboard` on the VPS — those
edits get overwritten on the next deploy. On success:

```bash
curl -I https://s47-social-flow.duckdns.org/health
```

should return `200` (or `503` if Metricool/DB creds are wrong — check
`docker compose -f docker-compose.deploy.yml logs server` on the VPS, same as
the [DOCKER.md](DOCKER.md) "Verifying it's actually working" section).

Every subsequent push to `main` rebuilds both images **on the VPS** and
redeploys automatically — no manual VPS steps after the one-time setup above,
but each deploy does cost the VPS a minute or two of CPU/RAM to compile. The
deploy step only ever touches `/var/www/social-media-dashboard` and the
`social-flow-deploy` Compose project; it never restarts host nginx or any
other project's containers.

## Notes

- **Cert renewal** is handled by whatever already renews this host's other
  certs (`certbot.timer` or a cron job) — nothing new to maintain.
- **DuckDNS** re-pings every 5 min from the `duckdns` container. Hostinger VPS
  IPs are static in practice, so this is insurance against the rare
  reprovision/migration, not something you should expect to ever matter.
- **Rolling back** a bad deploy: `git revert` the bad commit and push, letting
  CI rebuild and redeploy forward — there's no previous image to fall back to
  since nothing is tagged/stored off-VPS.
- **Build load**: if deploys start feeling slow or the VPS gets noticeably
  sluggish during one, that's the `npm ci`/`tsc`/`vite build` steps competing
  with `doptor`/`task-tracker-s47` for CPU. Worth revisiting the GHCR
  (build-once-in-CI, pull-only-on-VPS) approach at that point.
- **Port 8082** is this project's only host-visible port (loopback-only). If
  something else on this VPS is already using it, pick a different free port
  in both `deploy/docker-compose.deploy.yml` (the `client` service's `ports:`)
  and `deploy/nginx-host-vhost.conf.example` (`proxy_pass`) before bootstrapping.
- **Database backups** aren't set up here — `socialflow_pgdata_prod` is a
  named Docker volume on the VPS with no automated offsite backup. Worth
  adding (e.g. a nightly `pg_dump` cron to S3/Backblaze) before this holds
  data you can't afford to lose.
