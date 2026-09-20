# Auctum Ledger — Architecture Contract (binding for all build agents)

Companion context: `/mnt/agents/output/BUILD-BRIEF.md` (facts from prior tasks) — this contract resolves its TBDs.
Persona framing: `/mnt/agents/output/expert-team.md` (act as your persona).

Auctum Ledger: SaaS marketing & CRM for specialty coffee green-bean distribution (importers/exporters ↔ roasters) + education/credentialing module. Rebranded from "greensheet". Brand: "Verified Origin. True Price." Voice: specialty-literate, numbers before adjectives, honest scarcity.

## 1. Workspace & file ownership (never touch another agent's files)

Repo mirror root: `/mnt/agents/output/AUCTUM_LEDGER_LOTSPACE/`

| Owner | Paths |
|---|---|
| ALREADY EXISTS (do not overwrite; extend only) | `localization/02-locale-files/*.json` (7 real locale files), `scripts/validate_locale_files.py`, `scripts/i18n_audit.py`, `docs/design/al-monogram.svg`, `app/server/db/migrations/20260913_01_credential_state_machine.sql`, `app/server/__tests__/credential_state.test.ts` (reviewed code) |
| FRONTEND agent | `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/tailwind.config.ts`, `app/postcss.config.js`, `app/index.html`, `app/.oxlintrc.json`, `app/src/**`, `app/public/**` |
| BACKEND agent | `app/server/**` (except the 2 existing files above), `app/.env.example` |
| DEVOPS agent | `app/Dockerfile.app`, `app/Dockerfile.proxy`, `app/nginx.conf`, `app/docker-compose.yml`, `app/docker-compose.dev.yml`, `app/.env.docker`, `.github/workflows/*.yml`, root `README.md`, root `deploy.sh`, root `docker-compose.prod.yml` |

## 2. Stack (pin versions from brief §2)

React 19 + Vite 8 + TS ~6.0.2 + Tailwind 3.4 + zustand 5 + react-router-dom 6.30 + framer-motion + lucide-react + recharts + react-i18next (+ i18next-http-backend, add it) + zod 4.4.3 (do NOT downgrade). Backend: express 4.21 + pg 8 + redis 4 + kafkajs 2 + jose 5 + openai 4.77 (chat proxy). Dev: vitest 4, tsx, oxlint, supertest, @testing-library/react, jsdom, node 22. Linter: oxlint, gate = 0 warnings.

`app/package.json` (frontend agent writes, EXACT script set):
```json
{
  "name": "app", "version": "1.0.0", "private": true, "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "oxlint .",
    "test": "vitest",
    "test:run": "vitest run",
    "server:dev": "tsx watch server/index.ts",
    "server:start": "tsx server/index.ts",
    "db:migrate": "tsx server/db/migrate.ts",
    "db:seed": "tsx server/db/seed.ts"
  }
}
```
Plus deps/devDeps per brief §2 (include `i18next-http-backend`). npm scripts run from `app/`.

## 3. Backend contract (BACKEND agent)

- `server/index.ts`: boots express app from `server/app.ts` (`createApp()`), listens `AI_PROXY_PORT || 3001`.
- `server/app.ts`: `express.json({limit:'256kb'})`, cors (origin from `AI_ALLOWED_ORIGINS` csv), `GET /health → {status:'ok'}`, mounts `/api/v1` router; **mount `/api/v1/chat` BEFORE JWT auth** (own API-key scheme via `OPENAI_API_KEY`; dev stub echo response when key absent); 404 fallback problem AL-GEN-1005; central error middleware emitting Problem JSON.
- `server/db/index.ts`: registry `db = { pg: Pool(process.env.DATABASE_URL) when set else null, redis, kafka, outboxQueue: [] }`. Dual-mode: when `DATABASE_URL` unset, routes use in-memory arrays (dev/test).
- `server/db/migrate.ts`: runs `server/db/migrations/*.sql` in filename order, executes only the `-- up` section (split on line `-- down`), tracks applied files in `migrations_applied` table, idempotent.
- Migrations to create (idempotent, `CREATE TABLE IF NOT EXISTS`, `-- up`/`-- down` sections, `set_updated_at()` triggers):
  - `202609110000_platform__base.sql` — pgcrypto ext, `telemetry` schema, `set_updated_at()`, and ALL base tables exactly per brief §4 (roasters, catalog_lots, campaigns, automation_rules, sample_kits, orders, webhook_subscriptions, referral_codes, referrals, reward_ledger, outbox_events) with the exact columns/types listed there.
  - `202609110100_telemetry__engagement.sql` — `telemetry.engagement_events` per brief §4 (hypertable creation guarded: `SELECT create_hypertable(...)` inside `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` so it no-ops on plain postgres).
  - `20260913_01_credential_state_machine.sql` — ALREADY EXISTS, keep verbatim.
- `server/db/seed.ts`: seeds 4 credential_states (already in migration), 6 roasters (micro/boutique/commercial segments, varied churn_risk_score), 8 catalog_lots (specialty-literate: e.g. "Ethiopia Guji Hambela washed, 1,900–2,200 masl, SCA 87.5"), campaigns ALT-001…ALT-005 (slugs `alt-001-first-crack` etc., day offsets 0/3/7/12/21), 3 automation rules, 2 sample kits, 2 orders, 2 referral_codes, 6 credentials across all four states.
- `server/lib/`: `problem.ts`, `idempotency.ts`, `authn.ts` (jose JWKS vs OIDC_ISSUER/OIDC_AUDIENCE; `AUTH_DISABLE=true` bypass non-prod), `authz.ts` (`requireScope`, `scopedToAccount`), `kafka.ts` (`emitEvent` CloudEvents 1.0, outbox fallback + `startOutboxRelay`) — semantics exactly per brief §5.
- Routes under `/api/v1` per brief §5 route table (roasters, catalog, campaigns, automation-rules, sample-kits, orders, webhooks, analytics, referrals, chat) with envelope `{data}` / `{data, page:{nextCursor:null, hasMore:false}}`, idempotency on all POST/PATCH.
- **NEW education module** (headline new feature):
  - `server/routes/credentials.ts`: `GET /credentials` (list, join state name), `GET /credentials/:id`, `GET /credentials/:id/events`, `POST /credentials/:id/transitions` body `{event: 'renew'|'drift_flagged'|'lapse', reason}` enforcing spec §5.2 transitions (renew: only from active → stays active, expires_at +1yr; drift_flagged: active|expiring→stale; lapse: active|expiring|stale→lapsed; lapsed terminal). Emits `al.education.credential_transitioned`. Errors: `AL-EDU-1001` credential not found (404), `AL-EDU-1002` invalid transition (409). `GET /education/tracks` returns static curriculum tracks (in-memory constant; i18n keys under `curriculum.*`).
  - Share transition logic in `server/lib/credentialStateMachine.ts` (pure, unit-testable).
- Tests: `server/__tests__/credential_state.test.ts` EXISTS (pg integration, skips without DATABASE_URL — keep). ADD `server/__tests__/credentialStateMachine.test.ts` (pure unit tests, no DB: all valid/invalid transitions), `server/__tests__/problem.test.ts`, `server/__tests__/idempotency.test.ts`. All must pass with plain `vitest run` without any services.

## 4. Frontend contract (FRONTEND agent)

- Entry `src/main.tsx`, router with `/{locale}/...` prefix (`LocaleLayout`, redirect `/` → detected locale), locales from `SUPPORTED_LOCALES = ['en-US','zh-CN','es-MX','pt-BR','vi-VN','de-DE','fr-FR']`; i18n via react-i18next + i18next-http-backend, `loadPath: '/locales/{{lng}}/{{ns}}.json'`, fallbackLng en-US, detection path > localStorage("auctum:locale") > navigator. Preload `common`+`errors`.
- `public/locales/<lng>/<ns>.json`: generate by splitting the existing top-level namespaces of `localization/02-locale-files/*.json` (write a small node script `scripts/split-locales.mjs` at repo root and RUN it to emit the split files; commit output).
- `src/api/http.ts` + `src/api/client.ts`: fetch wrappers vs `import.meta.env.VITE_API_BASE_URL ?? '/api/v1'`; map Problem JSON → typed errors (codes via `errors.codes.*`); send `Idempotency-Key: crypto.randomUUID()` on POST/PATCH.
- Layout: AppLayout sidebar groups exactly per brief §6 (SOURCE: Navigator, Catalog, Reservations · ENGAGE: Campaigns, Automation Rules · RELATIONSHIPS: Roasters, Sample Kits, Orders · INTELLIGENCE: Analytics, Webhooks · NEW EDUCATION group: Credentials, Tracks). Topbar: locale switcher, AI chat widget toggle.
- Pages (real UI, not lorem): Dashboard (growth widgets: WTR, KitFunnel, CacByChannel, HazardHeatmap, KFactor, CampaignLift — recharts, per brief §6), Catalog (lot cards with SCA score badge, process method, elevation masl, price/lb, real bag counts), Lot detail w/ reserve dialog, Reservations, Roasters (table + churn tier badge T0–T3), Roaster detail (interventions timeline), SampleKits (funnel status), Orders, Campaigns (ALT-001–005 sequence timeline), AutomationRules, Analytics, Webhooks, **Credentials (education wallet: state badge active/expiring/stale/lapsed with distinct accessible colors, renew/flag/lapse actions calling transitions API, events audit drawer)** and **Tracks (curriculum tracks, modules, progress bars)**. Navigator = origin map-styled explorer page (list + filters acceptable, no map lib).
- AI chat widget: floating panel calling `${VITE_AI_PROXY_URL}/api/v1/chat` (i18n ns `agent`).
- Design system (tailwind.config.ts): colors `ink:#16323E`, `ink-900:#26201A`, `parchment:#F6F1E7`, `paper:#FBFAF6`, `brass:#C9A34A`, `green:#2F6B4A`, `amber:#A8721F`; fonts display `["Playfair Display","Cormorant Garamond","Georgia","serif"]`, mono `["JetBrains Mono","monospace"]`, sans system stack. Credential state colors: active=green, expiring=amber, stale=brass/gray, lapsed=red-700 — all with text contrast WCAG AA on parchment. Copy `docs/design/al-monogram.svg` → `app/public/brand/al-monogram.svg` and use in sidebar. Documentary-honesty aesthetic, no purple/blue gradients.
- Zustand slices for credentials + catalog at minimum; other pages may fetch directly via client.
- Tests: keep light — `src/__tests__/apiClient.test.ts` (problem mapping, idempotency header) and `src/__tests__/credentialBadge.test.tsx` (Testing Library). Must pass under vitest jsdom.
- Env: `.env.example` owned by backend agent — frontend reads only `VITE_API_BASE_URL`, `VITE_AI_PROXY_URL`.

## 5. DevOps contract (DEVOPS agent)

- `app/Dockerfile.app` (multi-stage, target `prod`): node:22-alpine build (`npm ci || npm install`, `npm run build`) → nginx:alpine serving dist on port 80 with `app/nginx.conf`; `additional_contexts: localization=../localization/02-locale-files` — copy locale JSONs into image and split at build (run `node ../scripts/split-locales.mjs` equivalent inside build stage; simplest: copy `public/locales` committed output instead — frontend agent commits split files, so Dockerfile just builds).
- `app/Dockerfile.proxy` (target `prod`): node:22-alpine, `npm ci || npm install`, run `server/index.ts` via tsx (or compile), EXPOSE 3001, healthcheck wget `/health`.
- `app/nginx.conf`: SPA fallback per brief §3 PLUS new resolver block: `location /api/ { proxy_pass http://api:3001; }` with standard headers (resolves the TBD).
- `app/docker-compose.yml` (prod): services postgres, timescaledb, redis, kafka, api, app exactly per brief §3 table (images, ports 5432/5433/6379/9092/3001/80, volumes pgdata/tsdata, healthchecks, env wiring, network `auctum-ledger-network`), PLUS one-shot `migrate` service (build Dockerfile.proxy, `command: npm run db:migrate`, profile `migrate`, depends_on postgres healthy) resolving the migration-orchestration gap.
- `app/docker-compose.dev.yml`: postgres+redis+kafka only, ports per brief, default network; `app/.env.docker` per brief §3.
- `.github/workflows/`: rebrand the three legacy workflows (they remain at repo root as archive): `test.yml` (oxlint + vitest + docker build test), `docker-build.yml` (matrix app/proxy → GHCR `ghcr.io/marcusdax/auctum-ledger-app|proxy`, tags latest/sha/semver, Trivy sarif upload), `deploy.yml` (workflow_run gate, GitHub Deployment record), plus NEW `i18n.yml` (JSON validity + `python3 scripts/validate_locale_files.py` + `scripts/i18n_audit.py`). Use `npm ci` with `cache-dependency-path: app/package-lock.json`.
- Root `README.md`: full launch doc — what Auctum Ledger is, quickstart (`docker compose -f app/docker-compose.yml --profile migrate up --build`), local dev (npm run dev + server:dev), ports table, CI/CD, i18n, education module, links to docs/expert-team.md. Root `deploy.sh` + `docker-compose.prod.yml`: rebranded copies of the legacy ones (auctum-ledger image names).
- Validate: `docker compose -f app/docker-compose.yml config` must pass (run it).

## 6. Conventions all agents must honor

- No "greensheet" strings anywhere new; AL-* codes, al.* topics, auctumledger.io domains.
- Ports: app 80, api 3001, postgres 5432, timescaledb 5433, redis 6379, kafka 9092.
- All new code TypeScript strict; oxlint-clean; no placeholder TODOs in shipped code.
- Merge tags `{snake_case}` byte-identical across locales; brand tokens never translated.
- Do not modify the two reviewed files (migration + pg test) except to fix a proven bug.
