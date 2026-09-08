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

## Target architecture (Phase 7)

The launch plan moves off the Cloudflare-Tunnel-to-a-host setup before there are
paying customers. A tunnel to a home/office box is not a production posture.

| Layer | Target | Notes |
| --- | --- | --- |
| Frontend | Vercel or Cloudflare Pages | Static landing + built SPA, global CDN, per-branch previews |
| API | Railway or Render | Takes the existing `server/Dockerfile` almost as-is |
| Postgres | Neon or Supabase | Managed, daily backups **+ point-in-time recovery**, pooling, branching |

Migration notes:
- The app already serves the landing page at `/` and the SPA at `/app`, so the
  static/SPA split the plan calls for is effectively done — point the frontend
  host at `landing/` + the `dist/` build.
- Move `DATABASE_URL` to the managed Postgres connection string; everything else
  is env already (`server/docker-compose.yml` lists the full set).
- Keep the **independent `pg_dump` off-host copy** even with a managed provider —
  provider backups don't protect against losing account access or a bad
  migration that replicates cleanly.
- Prefer daily backups + PITR over an HA replica at this scale (launch plan 7c).
- Set `COOKIE_SECURE=true` once served exclusively over HTTPS.

### Ops that ship with the repo
- **CI** — `.github/workflows/ci.yml` runs typecheck + tests + build for web,
  server, and mobile on every push and PR.
- **Structured logging** — the API emits JSON-line logs (`server/src/log.ts`);
  set `LOG_LEVEL` (`debug|info|warn|error`, default `info`). Hosted platforms
  index these directly.

Still to wire (needs accounts/DSNs): Sentry error monitoring (good Expo
support), uptime monitoring with alerting, and a staging environment separate
from production.

---

## 8. Running alongside tv-tracker

Nothing to change on the tv-tracker side. The two stacks share only the Docker
engine:

- Distinct container names (`roundsahead_*` vs `tvtracker_*`) and volumes.
- RoundsAhead publishes host port **8080**; tv-tracker uses **4000** / **5432**.
- Each stack has its **own** Cloudflare Tunnel and token.

Manage them independently with `docker compose` from their respective folders.
