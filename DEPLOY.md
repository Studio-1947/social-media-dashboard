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
  -> GitHub Actions builds server + client images (server/Dockerfile, client/Dockerfile, both `prod` target)
  -> pushes both to ghcr.io/studio-1947/social-media-dashboard-{server,client}
  -> SSHes into the VPS: git fetch/reset the existing clone, docker compose pull, up -d

On the VPS:
  host nginx (already running, :80/:443, fronts other sites too)
    -> new vhost for s47-social-flow.duckdns.org, TLS via host certbot
    -> proxy_pass to 127.0.0.1:8082

  docker compose project "social-flow-deploy" (deploy/docker-compose.deploy.yml):
    client (127.0.0.1:8082, nginx: SPA + /api proxy) -> server (:5000, internal only) -> db (Postgres, internal only)
    duckdns — re-pings DuckDNS every 5 min so the domain keeps pointing here
```

This reuses the existing `server/Dockerfile` and `client/Dockerfile` unchanged
— same images as `docker-compose.prod.yml`, just built by CI instead of
locally and pulled instead of built on the VPS. See [DOCKER.md](DOCKER.md) for
what those images actually contain.

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
docker compose -f docker-compose.deploy.yml up -d
```

First boot pulls the `db`/`duckdns` images fine, but `server`/`client` won't
exist on GHCR yet until the GitHub Actions workflow has pushed them at least
once — that happens in the next section.

## 2. GitHub repo secrets

Settings -> Secrets and variables -> Actions, add:

| Secret | Value |
|---|---|
| `VPS_HOST` | `187.127.185.82` |
| `VPS_USER` | the `deploy` user (or whichever user owns `/var/www/social-media-dashboard`) |
| `VPS_SSH_KEY` | private key for a **deploy-only** SSH keypair (generate with `ssh-keygen -t ed25519 -f deploy_key -N ""`; put `deploy_key.pub` in that user's `~/.ssh/authorized_keys`, paste `deploy_key` — the private half — here). This is separate from whatever key the `deploy` user already uses to `git clone`/`git pull` *from* GitHub — that direction doesn't change. |
| `VPS_SSH_PORT` | `22` (or whatever you changed it to) |
| `GHCR_USERNAME` | your GitHub username |
| `GHCR_PAT` | a classic PAT with only the `read:packages` scope — used by the VPS to `docker login ghcr.io` and pull. `GITHUB_TOKEN` can't be used here since it's scoped to the Actions run, not usable from an external SSH session. |

`GITHUB_TOKEN` (automatic, no setup needed) is what the build job itself uses
to *push* images — only the VPS-side pull needs the PAT above.

If you'd rather skip the PAT entirely: after the first push, go to the
package's GitHub page (org -> Packages -> `social-media-dashboard-server` /
`-client`) and set visibility to Public. Then `docker login` on the VPS is
unnecessary and that line can be deleted from the workflow. Given this is a
client-facing dashboard, keeping the packages private (PAT approach) is the
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

Every subsequent push to `main` rebuilds both images and redeploys
automatically — no manual VPS steps after the one-time setup above. The
deploy step only ever touches `/var/www/social-media-dashboard` and the
`social-flow-deploy` Compose project; it never restarts host nginx or any
other project's containers.

## Notes

- **Cert renewal** is handled by whatever already renews this host's other
  certs (`certbot.timer` or a cron job) — nothing new to maintain.
- **DuckDNS** re-pings every 5 min from the `duckdns` container. Hostinger VPS
  IPs are static in practice, so this is insurance against the rare
  reprovision/migration, not something you should expect to ever matter.
- **Rolling back** a bad deploy: re-run the workflow for an older commit
  (Actions tab -> select the run -> "Re-run all jobs"), or `git revert` the bad
  commit and push, letting CI redeploy forward.
- **Port 8082** is this project's only host-visible port (loopback-only). If
  something else on this VPS is already using it, pick a different free port
  in both `deploy/docker-compose.deploy.yml` (the `client` service's `ports:`)
  and `deploy/nginx-host-vhost.conf.example` (`proxy_pass`) before bootstrapping.
- **Database backups** aren't set up here — `socialflow_pgdata_prod` is a
  named Docker volume on the VPS with no automated offsite backup. Worth
  adding (e.g. a nightly `pg_dump` cron to S3/Backblaze) before this holds
  data you can't afford to lose.
