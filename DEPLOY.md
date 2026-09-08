# Deploying RoundsAhead

RoundsAhead runs as a small, self-contained Docker stack on your Windows host,
published securely at **https://pathpilot.meetiqpro.ai** via a Cloudflare
Tunnel, and gated to approved emails with **Cloudflare Access**.

It is designed to sit **next to the tv-tracker stack** on the same machine with
no conflicts — separate container/volume names, its own tunnel, and host ports
(`8080`) that don't overlap tv-tracker (`4000`, `5432`).

```
Browser ── HTTPS ──> Cloudflare (Access login) ──> Tunnel ──> cloudflared
                                                                  │
                                                          web (nginx :80)
                                                         /              \
                                                 static SPA         /api ─> api (:4100)
                                                                              │
                                                                   Postgres (volume)
```

> ⚠️ **This document describes the *current* self-hosted stack.** Phase 7 of the
> launch plan migrates off the Cloudflare-Tunnel-to-a-host setup to managed
> hosting before there are paying customers — see
> **[Target architecture (Phase 7)](#target-architecture-phase-7)** below.

## Components

| Container              | Role                                                        | Host port |
| ---------------------- | ----------------------------------------------------------- | --------- |
| `roundsahead_web`        | nginx — serves the landing page (`/`) + SPA (`/app`), proxies `/api` | `8080`    |
| `roundsahead_api`        | Node/Express + Prisma — auth, per-user sync, billing        | internal  |
| `roundsahead_postgres`   | Postgres 16 — application database                          | internal  |
| `roundsahead_cloudflared`| Cloudflare Tunnel to the public hostname                    | —         |

Data lives in the `roundsahead_pgdata` Docker volume (the Postgres database).
The API connects via `DATABASE_URL` and applies migrations on start
(`prisma migrate deploy`).

---

## 1. Prerequisites

- Docker Desktop (or Docker Engine) running on the Windows host.
- The `meetiqpro.ai` zone in your Cloudflare account.
- A Cloudflare **Zero Trust** team (free plan is fine).

---

## 2. Create the Cloudflare Tunnel

1. Cloudflare dashboard → **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**.
2. Type **Cloudflared**, name it e.g. `pathpilot`.
3. Copy the **tunnel token** it shows (a long string) — this goes in `.env`.
4. Under the tunnel's **Public Hostnames**, add:
   - **Subdomain:** `pathpilot`  **Domain:** `meetiqpro.ai`
   - **Service:** `HTTP`  →  `web:80`
     > `web` is the container name on the compose network; the tunnel runs in
     > the same stack, so it reaches nginx directly.
5. Save. Cloudflare creates the `pathpilot.meetiqpro.ai` DNS record automatically.

---

## 3. Lock it down with Cloudflare Access

1. **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. **Application domain:** `pathpilot.meetiqpro.ai`.
3. Add a **policy**:
   - Action: **Allow**
   - Include → **Emails** → list the family member emails that may sign in.
4. Save. On the application's **Overview** page, copy the
   **Application Audience (AUD) Tag** — this is `CF_ACCESS_AUD`.
5. Your team domain (e.g. `yourteam.cloudflareaccess.com`) is `CF_ACCESS_TEAM_DOMAIN`
   (Zero Trust → Settings → Custom Pages / team domain).

The backend verifies the signed Access JWT on every request and keys each
user's data to their verified email — so no passwords are stored anywhere.

---

## 4. Configure `.env`

On the host, in the project folder:

```bash
cp .env.example .env
```

Fill in:

```env
CLOUDFLARE_TUNNEL_TOKEN="<token from step 2>"
CF_ACCESS_TEAM_DOMAIN="yourteam.cloudflareaccess.com"
CF_ACCESS_AUD="<AUD tag from step 3>"
```

---

## 5. Launch

```bash
# Build and start everything, including the tunnel
docker compose --profile cloudflare up -d --build
```

Then:

- Public: **https://pathpilot.meetiqpro.ai** (prompts Cloudflare Access login).
- On the LAN (no Access gate): **http://<windows-host-ip>:8080**.
- API health: `curl http://localhost:8080/api/health` → `{"ok":true,...}`.

> Omit `--profile cloudflare` to run only `web` + `api` locally (LAN-only, no
> public URL). In that mode the API has no Access in front, so it uses the
> single `dev@local` identity.

---

## 6. Updating after code changes

```bash
git pull
docker compose --profile cloudflare up -d --build
```

The `roundsahead_data` volume (everyone's saved portfolios) persists across
rebuilds.

---

## 7. Backups

The database is Postgres, in the `roundsahead_pgdata` volume. Use the scripts —
don't tar the volume (a live volume copy can be inconsistent).

```bash
# Nightly logical backup: pg_dump inside the container, gzipped to ./backups,
# validity-checked, with old backups pruned. Cron it (see the script header).
./scripts/backup-db.sh

# Restore a dump (into the live DB, or a scratch DB for a test restore):
./scripts/restore-db.sh backups/roundsahead_YYYYMMDD_HHMMSS.sql.gz
./scripts/restore-db.sh backups/roundsahead_....sql.gz roundsahead_restore_test
```

**Independent off-host copy (do this — it's the step people skip).** Set
`RCLONE_REMOTE` to an rclone remote pointing at object storage you control
(Cloudflare R2, S3). `backup-db.sh` then pushes each dump off the host, so a
total VM loss or lost account access doesn't take the backups with it.

**Test the restore.** An untested backup is not a backup — restore into a
scratch DB once a quarter and confirm the data is really there.

Users can also self-export their own data any time via the in-app
**Backup & Restore** button (JSON download/restore).

---

## Managed hosting (Phase 7 — the production target)

Moves off the Cloudflare-Tunnel-to-a-host setup. A tunnel to a home/office box is
not a production posture for paying customers.

**Chosen stack (~$12/mo at launch):**

| Layer | Provider | Plan | Cost |
| --- | --- | --- | --- |
| Frontend (landing + SPA) | **Cloudflare Pages** | Free | $0 |
| API (Express/Prisma Docker) | **Render** | Starter (always-on) | $7/mo |
| Postgres | **Neon** | Launch (PAYG, PITR + branching) | ~$5–20/mo |
| Errors | Sentry | Developer (free) | $0 |
| Transactional email | Resend | Free | $0 |

One origin, cookies stay first-party: Cloudflare Pages serves the site and
**proxies `/api/*` to Render** via `functions/api/[[path]].ts`, so the browser
only ever sees `roundsahead.com` — no CORS, no cross-site cookie changes (mirrors
what nginx did). The mobile app uses Bearer tokens and can hit the API directly.

### 1. Neon (database)
1. Create a project; pick a region near the Render region (below).
2. Copy the **pooled** connection string (has `-pooler`); append `?sslmode=require`.
3. On the Launch plan, disable scale-to-zero (or accept a brief cold start).

### 2. Render (API) — via `render.yaml`
1. New → **Blueprint**, point at this repo. Render reads `render.yaml`
   (Docker web service, health check `/api/health`, `starter` plan).
2. Fill the `sync:false` secrets in the dashboard: `DATABASE_URL` (the Neon
   string), `JWT_SECRET`, the Google/Apple/Stripe/Scorecard values, `SENTRY_DSN`.
3. Sign in with Apple: upload the `.p8` as a **Secret File** and set
   `APPLE_PRIVATE_KEY_PATH` to its mounted path (e.g. `/etc/secrets/apple_key.p8`).
4. Deploy. `npm start` runs `prisma migrate deploy` first, so the schema is
   created/updated automatically.

### 3. Cloudflare Pages (frontend)
1. Create a Pages project from this repo.
2. **Build command:** `npm run build:pages`  ·  **Output directory:** `pages-dist`
   (assembles `landing/` at `/` and the SPA at `/app`; see `scripts/assemble-pages.mjs`).
3. Add an environment variable **`API_ORIGIN`** = the Render service URL
   (e.g. `https://roundsahead-api.onrender.com`, no trailing `/api`). The proxy
   Function reads it.
4. Add the custom domain `roundsahead.com` (Pages) and point DNS at Cloudflare.

### 4. Cut-over checklist
- `APP_BASE_URL=https://roundsahead.com` and `COOKIE_SECURE=true` on Render.
- OAuth redirect URIs (Google/Apple) → `https://roundsahead.com/api/auth/...`.
- Stripe webhook endpoint → `https://roundsahead.com/api/billing/webhook`
  (subscribe to the 5 events; see `.env.example`).
- Mobile `EXPO_PUBLIC_API_BASE_URL` → `https://roundsahead.com/api`.
- Keep the **independent off-host `pg_dump`** (`RCLONE_REMOTE`) even with Neon —
  provider backups don't cover lost account access or a bad migration.
- Retire the Cloudflare Tunnel + Access once traffic is on Pages/Render.

### Ops that ship with the repo
- **CI** — `.github/workflows/ci.yml` runs typecheck + tests + build for web,
  server, and mobile on every push and PR.
- **Structured logging** — JSON-line logs (`server/src/log.ts`, `LOG_LEVEL`);
  Render indexes these directly.
- **Error monitoring** — Sentry, env-gated (`SENTRY_DSN` on Render,
  `EXPO_PUBLIC_SENTRY_DSN` for the Expo build); no-op until set.

Still to wire (account-side): uptime monitoring with alerting, and a staging
environment (a second Render service + a Neon branch) separate from production.

---

## 8. Running alongside tv-tracker

Nothing to change on the tv-tracker side. The two stacks share only the Docker
engine:

- Distinct container names (`roundsahead_*` vs `tvtracker_*`) and volumes.
- RoundsAhead publishes host port **8080**; tv-tracker uses **4000** / **5432**.
- Each stack has its **own** Cloudflare Tunnel and token.

Manage them independently with `docker compose` from their respective folders.
