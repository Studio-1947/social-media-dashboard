# Running Social Flow in Docker

Three services now: client, server, and Postgres (`db`) for user accounts.
Two stacks — use the dev one day to day.

## First run

Credentials live in `server/.env`, which is gitignored and **not** created for you:

```bash
cp server/.env.example server/.env
# then fill in METRICOOL_API_TOKEN, METRICOOL_USER_ID, METRICOOL_BLOG_ID,
# JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
```

Without the Metricool credentials, the stack still boots — it just can't reach
Metricool, and says so loudly in the boot log. That's deliberate: a missing
credential should be obvious, not silently degrade to sample data.

**Without `JWT_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`, nobody can log in at
all** — every `/api/metricool` route requires auth. `ADMIN_EMAIL`/
`ADMIN_PASSWORD` bootstrap the first admin account automatically on boot (only
if the `users` table has no admin yet — it never overwrites an existing one).
Log in with those, then use the admin panel (Sidebar → Team Access) to add
everyone else and change your own password.

## Dev (hot reload)

```bash
docker compose up --build
```

| | |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/health |
| Postgres | internal only — not published to the host |
| DB browser (Adminer) | http://localhost:8081 |

Client and server reload on save — `client/src` and `server/src` are
bind-mounted. `node_modules` stays inside the images, so you don't need a local
`npm install` and a host `node_modules` built for a different platform can't
leak in. Postgres data persists across restarts in the named volume
`socialflow_pgdata`; `docker compose down -v` deletes it (and every user
account) — plain `docker compose down` does not.

The browser calls the API at `localhost:5000` (a cross-origin request), so the
server's CORS allowlist must contain `http://localhost:5173`. Compose sets that
via `FRONTEND_URLS`. Auth is a bearer token (`Authorization: Bearer <token>`),
not a cookie, specifically so this cross-origin dev setup needs no special
cookie/SameSite configuration — the same client code works unchanged against
the same-origin nginx-proxied prod stack.

## Prod parity (what actually ships)

```bash
docker compose -f docker-compose.prod.yml up --build
```

Everything on **http://localhost:8080**.

Differences that matter:

- The client is a static Vite build served by nginx, not the dev server.
- nginx reverse-proxies `/api` and `/health` to the server, so the browser talks
  to one origin and CORS never applies.
- The server's port is **not** published — nothing reaches it except via nginx.
- The server runs compiled JS as a non-root user, with no dev dependencies.

`VITE_API_BASE_URL` is a **build argument**, not a runtime env var: Vite inlines
it into the bundle. Changing it means rebuilding the client image, not restarting
the container. It defaults to the relative `/api/metricool`, which is what makes
the nginx proxy work.

## Verifying it's actually working

A wrong Metricool token doesn't crash anything — it degrades to badged sample
data. A missing DB/JWT config doesn't crash anything either — every login just
fails. Both fail quietly enough that checking the boot log is worth doing after
any credential change:

```bash
docker compose logs server | grep -E "Metricool|Auth"
# want: [Metricool] OK — N client(s) available. Default: "…" (blogId …)
# want: [Auth] Bootstrapped admin account: you@company.com
# not:  [Metricool] STARTUP CHECK FAILED — …
# not:  [Auth] NOT CONFIGURED — …

curl localhost:5000/health        # dev
curl localhost:8080/health        # prod
# want: {"metricool":{"status":"ok"},"db":{"status":"ok"}}
```

`/health` returns HTTP 503 if *either* Metricool or the database is failing, so
uptime monitoring can alert on either directly.

Note the container healthchecks intentionally probe `/`, not `/health` — a
container with a bad Metricool token or bad DB config is still *running*, and
marking it unhealthy would stop the client from starting at all.

### Browsing the database directly

No ORM in this project — `server/src/config/db.ts` is raw `pg` with hand-written
SQL, so there's no `prisma studio` or equivalent built in. **Adminer** (dev stack
only — deliberately not in `docker-compose.prod.yml`) fills that gap: a web GUI
for Postgres with zero code changes.

Open this exact link, not just http://localhost:8081 — Adminer's own default
System is **MySQL / MariaDB**, and pointing that at a Postgres-only port gets
you an immediate "Connection refused" before your password is ever checked:

```
http://localhost:8081/?pgsql=db&username=socialflow&db=socialflow
```

That query string pre-selects PostgreSQL and fills in Server/Username/Database.
Adminer deliberately never accepts a password via URL, so you still type that
part yourself:

| Field | Value |
|---|---|
| System | PostgreSQL *(already selected by the link above)* |
| Server | `db` *(already filled)* |
| Username | `socialflow` *(already filled)* |
| Password | your `POSTGRES_PASSWORD` (dev default: `socialflow_dev_only`) |
| Database | `socialflow` *(already filled)* |

From there you can browse/edit the `users` table directly — useful for e.g.
manually fixing a row without going through the admin panel's API. Nothing about
this needs restarting: `docker compose up -d adminer` starts it independently of
the other services.

### Whitelisting a team

The first admin comes from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `server/.env` — log
in with that, then use the admin panel (bottom of the Sidebar → **Team Access**,
visible only to admins) to add everyone else: email + an initial password you
set yourself, since there's no email-invite flow (no SMTP configured in this
project — the admin shares the password out of band, e.g. Slack). Revoking
access is instant: an already-logged-in session is checked against the database
on every request, not just at token expiry, so revoking someone actually cuts
them off immediately rather than "within 7 days."

## Do I need to re-run anything after a change?

Almost never. Editing code requires **no docker command** — the source is
bind-mounted, nodemon restarts the server and Vite hot-reloads the browser.

Both watchers **poll**, and they have to. A Windows/macOS bind mount delivers no
filesystem events into the container, so an event-based watcher sees nothing and
silently never reloads — which looks exactly like your code change "not working".
`tsx watch` cannot do this (it uses `fs.watch` and exposes no polling option),
which is why the server's dev script runs `nodemon --legacy-watch` instead, and
why the client sets `CHOKIDAR_USEPOLLING`.

| What you changed | What to run |
|---|---|
| `server/src/**`, `client/src/**`, `index.html`, any config file | **nothing** |
| `server/.env` | `docker compose up -d --force-recreate` |
| `package.json` (new dependency) | `docker compose up -d --build` |
| `Dockerfile`, compose files, `nginx.conf` | `docker compose up -d --build` |

To confirm the server really reloaded (rather than assume), count its boots —
comparing log tails of different depths will fool you:

```bash
docker compose logs server | grep -c "Social Flow API"   # should increase after an edit
```

`.env` is the one that needs a recreate: env vars are read once at container
start, and a plain `docker compose restart` will **not** pick up a new token.

Dependencies need a rebuild because `npm ci` runs at image build time — a newly
installed package won't appear just from restarting.

### Don't pass a single service name to `--force-recreate`

```bash
docker compose up -d --force-recreate server   # ← ALSO STOPS THE CLIENT
```

The client `depends_on` the server, so Compose tears it down too and leaves it
stopped. Recreate the whole stack instead — it's just as fast and the client
comes back:

```bash
docker compose up -d --force-recreate
```

## Common commands

```bash
docker compose up -d --build      # rebuild + start detached
docker compose logs -f server     # follow server logs
docker compose logs -f client     # follow Vite (HMR updates log here)
docker compose ps                 # is anything Exited?
docker compose down               # stop
```

If the UI stops updating, check `docker compose ps` first — an `Exited` client
looks exactly like broken hot reload.
