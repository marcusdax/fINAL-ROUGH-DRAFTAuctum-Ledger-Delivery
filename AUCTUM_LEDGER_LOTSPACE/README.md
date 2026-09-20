# Auctum Ledger

**Verified Origin. True Price.**

Auctum Ledger is a SaaS marketing & CRM platform for specialty coffee green-bean
distribution — connecting importers/exporters with roasters around verified,
lot-level data: SCA cup score, process method, elevation (masl), varietal,
traceability, and ESG. It ships with the ALT-001–005 sample-kit campaign engine,
the "Give a Kit, Get a Bag" referral program, churn-hazard intelligence, and an
education/credentialing module with a full credential state machine
(active → expiring → stale → lapsed).

Parent brand: Auctum, Inc. — *Navigate Your Reality. Own Your Journey.*

## Stack

- **Frontend**: React 19 · Vite 8 · TypeScript ~6 · Tailwind 3.4 · zustand 5 ·
  react-router-dom 6.30 · recharts · framer-motion · react-i18next
- **Backend**: Express 4.21 + TypeScript (tsx) · PostgreSQL 16 (+ TimescaleDB
  for telemetry hypertables) · Redis 7 · Kafka 3.8 (CloudEvents 1.0 outbox) ·
  OIDC auth via jose · OpenAI-backed chat proxy
- **Delivery**: Docker multi-stage builds · Docker Compose · GitHub Actions
  CI/CD · GHCR · Trivy vulnerability scanning

## Quickstart (full stack, one command)

```bash
docker compose -f app/docker-compose.yml --profile migrate up --build
```

This builds and starts all six services, then runs the one-shot `migrate`
service to apply the SQL migrations before the API serves traffic:

| Service      | Port  | What it is                                        |
|--------------|-------|---------------------------------------------------|
| app          | 80    | React SPA via nginx (SPA fallback + `/api/` proxy) |
| api          | 3001  | Express API proxy (`/api/v1/*`, `/health`)         |
| postgres     | 5432  | Primary OLTP database (`auctum-ledger`)            |
| timescaledb  | 5433  | Telemetry/engagement hypertables                   |
| redis        | 6379  | Idempotency keys + cache                           |
| kafka        | 9092  | Domain event bus (`al.*` topics)                   |

Open http://localhost (redirects to your detected locale, e.g. `/en-US`).
Health check: `curl http://localhost:3001/health`.

## Local development (hot reload)

```bash
# 1. Start infrastructure only
docker compose -f app/docker-compose.dev.yml up -d

# 2. Point the app at the local infra
cp app/.env.docker app/.env

# 3. Install + run (from app/)
cd app
npm ci
npm run db:migrate   # apply migrations
npm run db:seed      # seed roasters, lots, campaigns ALT-001–005, credentials
npm run server:dev   # Express API on :3001 (tsx watch)
npm run dev          # Vite dev server on :5173 (separate terminal)
```

Tests and lint (gate: 0 warnings):

```bash
npm run test:run   # vitest
npm run lint       # oxlint
```

## Container images

Multi-stage Dockerfiles live in `app/`:

- `Dockerfile.app` — node:22-alpine build (`npm ci || npm install`,
  `npm run build`) → nginx:alpine serving `dist/` on port 80 with
  `app/nginx.conf` (SPA fallback, immutable `/assets/` caching, and a
  `location /api/ { proxy_pass http://api:3001; }` reverse proxy so browser
  API calls stay same-origin).
- `Dockerfile.proxy` — node:22-alpine running `server/index.ts` via tsx,
  `EXPOSE 3001`, wget healthcheck against `/health`.

Published to GHCR by CI:

```
ghcr.io/marcusdax/auctum-ledger-app:latest
ghcr.io/marcusdax/auctum-ledger-proxy:latest
```

## Production deployment

```bash
./deploy.sh production
```

`deploy.sh` pulls the pinned GHCR images, applies migrations via the one-shot
`migrate` compose service, and restarts the stack using
`app/docker-compose.yml` + the root `docker-compose.prod.yml` override (which
swaps local builds for `ghcr.io/marcusdax/auctum-ledger-app|proxy:latest`).

## CI/CD

Four workflows under `.github/workflows/`:

| Workflow           | Trigger                        | What it does |
|--------------------|--------------------------------|--------------|
| `test.yml`         | push/PR to main                | oxlint (0-warning gate), vitest, Docker build smoke test |
| `docker-build.yml` | push to main / tags `v*.*.*`   | matrix build of `app` + `proxy` → GHCR (tags: `latest`, `<branch>-<sha>`, semver); Trivy CRITICAL/HIGH scan → GitHub Security tab |
| `deploy.yml`       | successful `docker-build` run  | creates a GitHub Deployment record + prints deploy instructions |
| `i18n.yml`         | changes to locales/src/scripts | JSON validity, locale parity/plural/placeholder/brand-token validation, key-usage audit |

All Node jobs use `npm ci` with `cache-dependency-path: app/package-lock.json`.

## Internationalization

Seven locales: `en-US` (source of truth), `zh-CN`, `es-MX`, `pt-BR`, `vi-VN`,
`de-DE`, `fr-FR`. Source files in `localization/02-locale-files/*.json` are
split into per-namespace files under `app/public/locales/<lng>/<ns>.json`
(committed; loaded by i18next-http-backend at `/locales/{{lng}}/{{ns}}.json`).
Routes are locale-prefixed (`/{locale}/...`); merge tags `{snake_case}` are
byte-identical across locales and brand tokens (`Auctum`, `Ledger`, SCA, ESG,
ALT-001–005) are never translated — all CI-gated by `i18n.yml`.

## Education & credentialing module

Credential wallet with a strict state machine — `renew` (active → active,
expiry +1yr), `drift_flagged` (active|expiring → stale), `lapse`
(active|expiring|stale → lapsed, terminal) — exposed at
`POST /api/v1/credentials/:id/transitions`, with a per-credential event audit
trail and static curriculum tracks at `GET /api/v1/education/tracks`.

## Further reading

- `CONTRACT.md` — binding architecture contract
- `docs/expert-team.md` — expert persona framing for the build team
- `app/server/db/migrations/` — idempotent SQL migrations (`-- up` / `-- down`)
