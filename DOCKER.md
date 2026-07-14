# Running Social Flow in Docker

Two stacks. Use the dev one day to day.

## First run

Credentials live in `server/.env`, which is gitignored and **not** created for you:

```bash
cp server/.env.example server/.env
# then fill in METRICOOL_API_TOKEN, METRICOOL_USER_ID, METRICOOL_BLOG_ID
```

Without it the stack still boots — it just can't reach Metricool, and says so
loudly in the boot log. That's deliberate: a missing credential should be
obvious, not silently degrade to sample data.

## Dev (hot reload)

```bash
docker compose up --build
```

| | |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/health |

Both services reload on save — `client/src` and `server/src` are bind-mounted.
`node_modules` stays inside the images, so you don't need a local `npm install`
and a host `node_modules` built for a different platform can't leak in.

The browser calls the API at `localhost:5000` (a cross-origin request), so the
server's CORS allowlist must contain `http://localhost:5173`. Compose sets that
via `FRONTEND_URLS`.

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

## Verifying it's actually talking to Metricool

A wrong token doesn't crash anything — it degrades to badged sample data. So
after any credential change, check both:

```bash
docker compose logs server | grep Metricool
# want: [Metricool] OK — N client(s) available. Default: "…" (blogId …)
# not:  [Metricool] STARTUP CHECK FAILED — …

curl localhost:5000/health        # dev
curl localhost:8080/health        # prod
# want: "status": "ok"
```

`/health` returns HTTP 503 when Metricool is failing, so uptime monitoring can
alert on an expired token directly.

Note the container healthchecks intentionally probe `/`, not `/health` — a
container with a bad Metricool token is still *running*, and marking it unhealthy
would stop the client from starting at all.

## Common commands

```bash
docker compose up -d --build      # rebuild + start detached
docker compose logs -f server     # follow server logs
docker compose down               # stop
docker compose down -v            # stop and drop volumes
docker compose build --no-cache   # after changing package.json
```

Changing dependencies means rebuilding — `npm ci` runs at image build time, so a
new package won't appear just from restarting.
