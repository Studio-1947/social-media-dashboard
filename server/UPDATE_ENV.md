# Backend `.env` setup

`server/.env` is not in git, so it drifts between local, Vercel and the VPS.
A wrong value here does **not** crash anything — the dashboard quietly degrades to
badged sample data. Assume nothing; verify after every change (see below).

Copy `.env.example` to `.env` and fill in the real values:

```env
PORT=5000
FRONTEND_URLS=http://localhost:5173,https://social-media-dashboard-one-chi.vercel.app

METRICOOL_BASE_URL=https://app.metricool.com
METRICOOL_API_TOKEN=<token from Metricool → Settings → API>
METRICOOL_USER_ID=<numeric userId — same for every brand on the account>
METRICOOL_BLOG_ID=<numeric blogId of the DEFAULT client; a fallback only>
METRICOOL_DEFAULT_TIMEZONE=Asia/Kolkata
```

All three Metricool credentials are account-wide except `METRICOOL_BLOG_ID`, which
identifies one client. Every real request from the dashboard carries an explicit
`blogId` from the client switcher — the env var is only used when a request omits one.

## Verify after any change

Restart the server and check **both**:

1. The boot log prints the self-check result. You want:
   `[Metricool] OK — N client(s) available. Default: "…" (blogId …). Networks: …`
   A failure prints `[Metricool] STARTUP CHECK FAILED — …` with the HTTP status.
2. `GET /health` returns `"status": "ok"`. It returns HTTP 503 when Metricool is
   failing, so uptime monitoring can alert on a stale token directly.

If you skip this, a bad token looks identical to "a quiet month" in the UI.
