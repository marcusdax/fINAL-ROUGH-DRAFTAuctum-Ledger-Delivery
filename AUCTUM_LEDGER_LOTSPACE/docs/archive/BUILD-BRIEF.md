# Auctum Ledger — Build Brief

Full-stack SaaS marketing & CRM platform for specialty coffee green-bean distribution
(connecting importers/exporters with roasters around verified, lot-level data: SCA cup
score, process method, elevation, varietal, traceability, ESG). Rebranded from "greensheet".
Parent brand: Auctum, Inc. — "Navigate Your Reality. Own Your Journey."

Category: *Verified Green Coffee Distribution*. Tagline: "Verified Origin. True Price."
Roof line: *Buy green coffee you can verify. Sell green coffee you can prove.*

---

## 1. Canonical conventions

### Rebranding map (binding, from SDD rulings — spec is authority over plan snippets)
| Old | New |
|---|---|
| `greensheet` (kebab identifiers) | `auctum-ledger` |
| `Greensheet` (brand) | `Auctum Ledger` |
| `GS-` error codes | `AL-` |
| `gs.` Kafka topic prefix | `al.` |
| `api.greensheet.io` | `api.auctumledger.io` |
| `auth.greensheet.io` | `auth.auctumledger.io` |
| `developers.greensheet.io` | `developers.auctumledger.io` |

- DB name/user: `auctum-ledger` (rebranded everywhere from `greensheet`).
- Problem type URI base becomes `https://api.auctumledger.io/problems/<code>`.
- App is served on port **80** (Global Constraints override older 8080 compose).
- A dedicated `timescaledb` service is kept even though dev compose may reuse the postgres extension.
- Legacy CI/CD artifacts (root `greensheet-ci-*.yml`, `ghcr.io/marcusdax/greensheet-proxy|app`) are pre-rebrand and superseded by the new compose stack.

### Error code namespace (`AL-*`, RFC 9457 Problem Details)
Observed codes:
- `AL-GEN-1003` idempotency conflict (same key, different body → 422)
- `AL-GEN-1004` missing `Idempotency-Key` on mutating request → 400
- `AL-GEN-1005` resource not found (404 catch-all; also used by frontend client as `GS.GEN_1005()` — rebrand to AL)
- `AL-CAT-1001` insufficient inventory · `AL-CAT-1002` lot retired or not found
- `AL-ROASTER-1001` roaster not found · `AL-ROASTER-1002` no fields to update
- `AL-CMP-1001` campaign not found · `AL-AUT-1001` automation rule not found
- `AL-SMP-1001` sample kit not found · `AL-ORD-1001` order not found · `AL-REF-1001` referral code not found

### Kafka topics (`al.*` prefix, CloudEvents 1.0 JSON)
Observed emitted topics:
`al.crm.roaster_registered`, `al.orders.order_created`, `al.sample_kit.requested`,
`al.webhook.created`, `al.campaign.created`, `al.automation-rule.created`,
`al.referral.clicked`, `al.referral.qualified` (+ clawed_back per task-5 report).
Domain event names (marketing layer): `sample_kit.delivered`, `feedback.submitted`,
`sample_kit.requested`, `lead.qualified`, `order.created`, `order.delivered`.

### Automation action enum
`SEND_EMAIL`, `SEND_SMS`, `UPDATE_CRM_LIFECYCLE`, `EXECUTE_CAMPAIGN_HALT`.

### Campaign IDs & merge tags
- Campaign IDs: **ALT-001–005** (never translate). Sequence: ALT-001 First Crack (day 0), ALT-002 The Cupping (day 3), ALT-003 The Shortlist (day 7), ALT-004 Second Cup (day 12), ALT-005 The Regular (day 21).
- Merge tags are single-brace, snake_case, **byte-identical across locales** (CI-enforced): `{sca_cup_score}`, `{process_method}`, `{origin}`, `{varietal}`, `{price_per_lb}`, `{flavor_notes}`, `{elevation_masl}`, `{region}`, `{lot_size_bags}`, `{first_name}`, `{roaster_name}`, `{contact_first_name}`, `{sender_name}`, `{peer_roaster_name}`, `{order_volume_lbs}`, `{available_lbs}`, `{arrival_date}`, `{harvest_window}`, `{kit_tracking_url}`, `{feedback_url}`, `{shortlist_url}`, `{referral_url}`, `{unsubscribe_url}`, `{preferences_url}`, `{booking_url}`, `{importer_name}`, `{rep_first_name}`, `{savings_estimate}`.
- UI strings use i18next `{{var}}` syntax; email/SMS use `{merge_tag}`.

### Economics constants (growth guardrails, keep consistent)
- Discount rate `d` = 10% (8–12% band). Blended CAC $378; ≤ $250 modeled, **hard cap $500**. Referral CAC ≤ $200. LTV:CAC ≥ 3:1. Churn hazard threshold (Cox partial hazard) **0.70** = high-risk line. Sample-to-sale conversion > 40%. First order rate > 60% of activated accounts within 30 days. 6-month retention > 75%. Gross margin > 40% distribution / > 75% platform SaaS. Legacy funnel baseline: Kit Sent 1000 → Opened 450 → Clicked 180 → Ordered 72 (7.2% kit→order).
- Segment CAC ceilings: micro $405 / boutique $1,800–1,807 / commercial $9,000–9,022 / supply $4,300.
- Churn tiers: T0 <0.30 Healthy · T1 0.30–0.55 Watch · T2 0.55–0.70 At-Risk · T3 ≥0.70 Critical. Tier-entry hysteresis: 2 consecutive nightly runs in-band; exits after 14 clean days; open `support.escalation` or `payment.delinquent_30d` promotes directly to T3.
- Pricing tiers: Cupper free $0 · Roaster Pro $49/mo · Roaster Business $149/mo · Exporter $499/mo · Import House $1,499/mo · Enterprise Trading Co. from $4,000/mo. Transaction take rate 1.0–1.5% on GMV.
- Referral engine "Give a Kit, Get a Bag": referrer reward $150 roast credit per qualified referral; referee gets free kit / first-order discount (see playbook).

---

## 2. Stack & dependencies (pin from package-lock, lockfileVersion 3, package name `app`)

Frontend/runtime deps:
- react ^19.2.7, react-dom ^19.2.7, react-router-dom ^6.30.4, zustand ^5.0.14
- tailwindcss ^3.4.19 (+ postcss ^8.5.19, autoprefixer ^10.5.4), framer-motion ^12.42.2, lucide-react ^1.25.0, recharts ^3.9.2
- react-hook-form ^7.83.0, @hookform/resolvers ^5.5.7, zod **^4.4.3** (ruling: keep 4.4.3, do NOT downgrade to ^3.23.0)
- i18next ^26.3.6, react-i18next ^17.0.10, i18next-browser-languagedetector ^8.2.1 (i18next-http-backend specified by i18n architecture — not yet in lockfile; add per §8)
- openai ^4.77.0 (AI chat proxy client)
- Backend: express ^4.21.2, cors ^2.8.5, pg ^8.13.0, kafkajs ^2.2.0, redis ^4.7.0, jose ^5.9.0

Dev deps:
- typescript ~6.0.2, vite ^8.1.1, @vitejs/plugin-react ^6.0.3, vitest ^4.1.10, jsdom ^30.0.0, tsx ^4.19.2, oxlint ^1.71.0 (linter), concurrently ^9.1.2
- node-pg-migrate ^7.5.0, supertest ^7.0.0, @testing-library/react ^16.3.2, @testing-library/jest-dom ^7.0.0
- @types/express ^5.0.0, @types/cors ^2.8.17, @types/pg ^8.11.0, @types/kafkajs ^1.9.0, @types/redis **^4.0.11** (not ^4.6.0 — that version doesn't exist; redis v4+ ships own types), @types/react ^19.2.17, @types/react-dom ^19.2.3, @types/node ^24.13.2, @types/supertest ^7.2.1

---

## 3. Docker Compose topology (task 2; rebranded values)

Prod `app/docker-compose.yml` services (all `restart: unless-stopped`, healthchecks interval 5s/retries 5 except kafka 10s/10):

| Service | Image/build | Ports (host:container) | Volumes/env highlights |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432:5432` | `pgdata:/var/lib/postgresql/data`; env `POSTGRES_USER/PASSWORD/DB=auctum-ledger`; healthcheck `pg_isready -U auctum-ledger` |
| `timescaledb` | `timescale/timescaledb:latest-pg16` | `5433:5432` | `tsdata:...`; same creds; same healthcheck |
| `redis` | `redis:7-alpine` | `6379:6379` | healthcheck `redis-cli ping` |
| `kafka` | `bitnami/kafka:3.8` | `9092:9092` | `KAFKA_BROKER_ID=1`, `KAFKA_LISTENERS=PLAINTEXT://:9092`, `KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092`, `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1`, `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`, `ALLOW_PLAINTEXT_LISTENER=yes`; depends_on redis; healthcheck `kafka-broker-api-versions.sh --bootstrap-server localhost:9092 \| head -1` |
| `api` | build `Dockerfile.proxy` target `prod` | `3001:3001` | env: `AI_PROXY_PORT=3001`, `AI_ALLOWED_ORIGINS=http://localhost,http://localhost:80`, `DATABASE_URL=postgresql://auctum-ledger:auctum-ledger@postgres:5432/auctum-ledger`, `REDIS_URL=redis://redis:6379`, `KAFKA_BROKERS=kafka:9092`, `OIDC_ISSUER=https://auth.auctumledger.io`, `OIDC_AUDIENCE=auctum-ledger-api`, `NODE_ENV=production`; depends_on postgres/timescaledb/redis/kafka `service_healthy` |
| `app` | build `Dockerfile.app` target `prod`, `additional_contexts: localization: ../localization/02-locale-files` | `80:80` | build args `VITE_AI_PROXY_URL=http://localhost`, `VITE_API_BASE_URL=/api/v1`; depends_on api healthy |

Volumes: `pgdata`, `tsdata`. Prod compose uses named network `auctum-ledger-network`; dev compose (`docker-compose.dev.yml`) has postgres/redis/kafka (no timescaledb — reuses postgres extension) on the default network.
`app/.env.docker`: `DATABASE_URL=postgresql://auctum-ledger:auctum-ledger@localhost:5432/auctum-ledger`, `REDIS_URL=redis://localhost:6379`, `KAFKA_BROKERS=localhost:9092`.
Validation gate: `docker compose config` must pass; `npm run docker:prod` is final validation (task 9).
Known caveats from reports: no migration service defined (run `npm run db:migrate` manually/CI before api); prod kafka depends_on redis without health condition.

### nginx (`app` container, listens 80)
SPA fallback `try_files $uri $uri/ /index.html;`; `/assets/` cached 1y immutable; `/index.html` `no-store`. Note: no `/api` proxy block in the shipped conf — backend reachability for `/api/v1` from the app container is **TBD by architect** (nginx reverse-proxy block likely needed since compose sets `VITE_API_BASE_URL=/api/v1`).

---

## 4. Database schema

Migrations via SQL files in `app/server/db/migrations/` (no `schema.ts` — raw SQL + `db.query` helper; node-pg-migrate available). Scripts: `npm run db:migrate`, `npm run db:seed` (seed: `app/server/db/seed.ts`, seeds from legacy `src/api/db.ts` data — note legacy `GS-*` referral codes like `GS-RVR-001` carried verbatim).

### Base migration `202609110000_platform__base.sql`
`CREATE EXTENSION pgcrypto; CREATE SCHEMA telemetry;` plus `set_updated_at()` trigger function and per-table `updated_at` triggers. Tables (all UUID PKs `DEFAULT gen_random_uuid()`):

- **public.roasters**: `roaster_name` NOT NULL, `segment` DEFAULT 'micro', `status` DEFAULT 'trial', `churn_risk_score NUMERIC(3,2)`, `ltv_cents BIGINT`, `cac_cents BIGINT`, `payback_months INT`, `days_since_last_order INT`, `total_revenue_cents BIGINT`, `total_orders INT`, `billing_cycle TEXT`, `last_activity_at TIMESTAMPTZ`, `created_at/updated_at`, `business_registration TEXT UNIQUE`, `tax_id`, `billing_address`, `primary_contact JSONB`, `interventions JSONB`.
- **public.catalog_lots**: `origin` NOT NULL, `varietal`, `processing_method`, `elevation INT`, `cup_score NUMERIC(4,1)`, `price_per_lb_cents INT NOT NULL`, `cost_per_lb_cents INT NOT NULL`, `available_quantity_lbs INT DEFAULT 0`, `total_production_lbs INT DEFAULT 0`, `esg_score NUMERIC(3,2)`, `logistics_score NUMERIC(3,2)`, `certifications JSONB`, `flavorNotes TEXT[]`, `sensory_profile JSONB`, `port_of_origin`, `estimated_arrival DATE`, `status DEFAULT 'active'`, `last_updated_at`.
- **public.campaigns**: `slug UNIQUE NOT NULL`, `name NOT NULL`, `description`, `status DEFAULT 'draft'`, `version INT DEFAULT 1`, `target_audience JSONB`, `rule_codes TEXT[]`, timestamps.
- **public.automation_rules**: `rule_code UNIQUE NOT NULL`, `campaign_id` FK→campaigns, `rule_name NOT NULL`, `trigger_event NOT NULL`, `conditions_json JSONB DEFAULT '{}'`, `version INT DEFAULT 1`, `status DEFAULT 'armed'`, `actions JSONB NOT NULL`, timestamps.
- **public.sample_kits**: `roaster_id` FK→roasters, `status DEFAULT 'requested'`, `lots JSONB NOT NULL`, `tracking_number`, `carrier`, `requested_at`, `shipped_at`, `delivered_at`, `feedback_token UUID UNIQUE DEFAULT gen_random_uuid()`, `feedback JSONB`, `feedback_submitted_at`, `temporal_workflow_id`.
- **public.orders**: `account_id UUID NOT NULL`, `status DEFAULT 'pending'`, `line_items JSONB NOT NULL`, `final_total_cents BIGINT NOT NULL`, `invoice_number`, timestamps.
- **public.webhook_subscriptions**: `url NOT NULL`, `events TEXT[] NOT NULL`, `status DEFAULT 'active'`, `signing_secret` DEFAULT `'whsec_' || encode(gen_random_bytes(16),'hex')`, `created_at`.
- **public.referral_codes**: `account_id NOT NULL`, `code UNIQUE NOT NULL`, `status DEFAULT 'active'`, timestamps.
- **public.referrals**: `referrer_id NOT NULL` FK→roasters, `referee_id` FK→roasters, `ref_code NOT NULL`, `status DEFAULT 'invited'`, `channel`, lifecycle timestamps (`clicked_at`, `signed_up_at`, `kit_requested_at`, `kit_delivered_at`, `feedback_submitted_at`, `first_order_delivered_at`, `qualified_at`, `clawed_back_at`), `review_status DEFAULT 'pending_review'`, `created_at`.
- **public.reward_ledger**: `account_id NOT NULL` FK→roasters, `referral_id` FK→referrals, `type NOT NULL`, `amount_cents INT NOT NULL`, `status DEFAULT 'posted'`, `description`, `created_at`, `posted_at`, `clawed_back_at`.
- **public.outbox_events**: `topic NOT NULL`, `key`, `payload JSONB NOT NULL`, `published BOOLEAN DEFAULT FALSE`, `error`, `attempts INT DEFAULT 0`, `created_at`, `published_at`.

### TimescaleDB migration `202609110100_telemetry__engagement.sql`
`telemetry.engagement_events(time TIMESTAMPTZ NOT NULL, event_id UUID, account_id NOT NULL, event_type NOT NULL, source, campaign_id UUID, session_id UUID, value NUMERIC, dimensions JSONB DEFAULT '{}', ingest_idem_key TEXT)` → hypertable on `time`, 7-day chunks.

### Credential state machine — migration `20260913_01_credential_state_machine.sql` (education module, spec §5.2)
- **credential_states**: `id` PK (int), `name` varchar NOT NULL, `description` text, `created_at`, `updated_at`. Seed rows: `active` = "valid, not expiring" · `expiring` = "within renewal window" · `stale` = "earned against superseded SOP" · `lapsed` = "expired or drift-suspended".
- **credential** table (created fresh by this migration): `state_id` integer NOT NULL, FK → `credential_states(id)` ON DELETE RESTRICT, default via subquery `(SELECT id FROM public.credential_states WHERE name='active')`; index on `credential(state_id)` only; `updated_at` trigger via `set_updated_at()`. (Other credential columns not specified in sources — **TBD by architect** per education spec.)
- **credential_events** (audit trail): references credential with CASCADE delete; records every transition.
- **Transition rules (spec §5.2, enforced in `transitionCredential` helper — these overrule the original brief's Step 5):**
  - `renew`: only from `active` → **stays `active`** with new expiry (+1 year). `expiring` is a scheduled/system state (spec §9), not a renew result.
  - `drift_flagged`: from `active` or `expiring` → `stale`.
  - `lapse`: from `active`, `expiring`, or `stale` → `lapsed`.
  - From `lapsed`: **no transitions** (terminal).
  - Invalid transitions (e.g. `renew` from `stale`, anything from `lapsed`) must be rejected.
- Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, conditional ALTER) with a clean `-- down` section.

### Other entities referenced (marketing schema blueprint, `coffee-marketing-schema.sql`)
`accounts` (with `segment` enum micro/boutique/commercial, `company_size` single_roaster/small_chain/regional/national, `churn_risk_score` CHECK [0,1]), `coffee_lots`, `campaign_tokens`, `marketing_templates`, `rule_actions`, `view_compiled_campaign_rules`, `churn_interventions(intervention_type, risk_score_before, outcome, assigned_to)`, `campaign_engagements`, `campaign_execution_logs`. Interplay: `churn_interventions.intervention_type` enum includes `'email_campaign'` (T1 rung); `get_high_risk_roasters(threshold=0.7)` is the canonical high-risk query.

---

## 5. API surface (Express + TS, mounted under `/api/v1`)

### App skeleton
- `app/server/app.ts` → `createApp()`: `express.json({ limit: '256kb' })`, `GET /health → {status:'ok'}`, mounts `createRouter()` at `/api/v1`, 404 fallback `problem(404, 'AL-GEN-1005', 'Resource not found')`.
- `app/server/db/index.ts` exports registry `db = { pg: Pool(DATABASE_URL), redis: createClient(REDIS_URL), kafka: new Kafka({brokers: KAFKA_BROKERS.split(',')}), outboxQueue: [] }`.
- Router index mounts `authenticate` middleware then routers; **`/chat` is mounted before JWT auth** (own API-key scheme).

### Routes (task 5, all implemented & tested)
| Router | Endpoints |
|---|---|
| roasters.ts | `GET /roasters`, `GET /roasters/:id`, `POST /roasters`, `PATCH /roasters/:id`, `POST /roasters/:id/interventions` |
| catalog.ts | `GET /catalog/lots`, `GET /catalog/lots/:id`, `POST /catalog/lots/:id/reservations` (row-level inventory update; AL-CAT-1001/1002) |
| campaigns.ts | `GET /campaigns`, `GET /campaigns/:id`, `POST /campaigns` |
| automation-rules.ts | `GET /automation-rules`, `GET /automation-rules/:id`, `POST /automation-rules` |
| sample-kits.ts | `GET /sample-kits`, `POST /sample-kits/request`, `POST /sample-kits/:id/feedback` |
| orders.ts | `GET /orders`, `GET /orders/:id`, `POST /orders` (with inventory reservation) |
| webhooks.ts | `GET /webhooks`, `POST /webhooks` |
| analytics.ts | `GET /analytics/campaign-performance/:campaignId` |
| referrals.ts | `GET /referrals/code/:code`, `GET /referrals/stats`, `POST /referrals/recordClick`, `POST /referrals/qualify`, `POST /referrals/:refCode/refund` |

- **Response envelope**: lists → `{ data: [...], page: { nextCursor, hasMore } }`; single → `{ data: {...} }`. (Cursors currently stubbed `null/false` — real cursor pagination TBD.)
- **Dual-mode**: routes use PostgreSQL when `DATABASE_URL` set, else in-memory arrays (test/dev convenience).
- Detailed payload shapes beyond the table columns above: **TBD by architect** (OpenAPI contract in engineering/02-openapi-contract.md not present in this dump).

### Middleware (task 4, `app/server/lib/`)
- `problem.ts` — RFC 9457 Problem: `{ type: 'https://api.auctumledger.io/problems/<code>', title: code, status, code, detail?, errors?: [{field, code, message}], traceId: crypto.randomUUID?.() }`.
- `idempotency.ts` — `checkIdempotency`/`storeIdempotency` + Express middleware reading `Idempotency-Key`; Redis `SET key body NX EX 86400`; missing key → 400 `AL-GEN-1004`; same key different body → 422 `AL-GEN-1003`; replay → 200. Falls back to in-memory Map when Redis unreachable (test-only). All mutating endpoints require the key.
- `authn.ts` — OIDC via `jose` `createRemoteJWKSet` + `jwtVerify` against `OIDC_ISSUER`/`OIDC_AUDIENCE`; returns `Principal`; dev override via `AUTH_DISABLE=true` (non-production) and local `LOCAL_JWT` test tokens.
- `authz.ts` — `requireScope(scope)` and `scopedToAccount(param)`. Follow-up noted: per-endpoint scopes (e.g. `roasters:write`) not yet enforced — apply when building.

### Events / Kafka outbox (task 6)
- `app/server/lib/kafka.ts` — `emitEvent` with dual signatures: `emitEvent(topic, key, data, type)` and `emitEvent({topic, key, data, type, source})`; CloudEvents specversion 1.0 wrapper; pushes to `db.outboxQueue` when Kafka unavailable (dev), else `kafka.producer().send(...)`. `startOutboxRelay` periodic task flushes outbox → Kafka, marks published (console-log in dev).

---

## 6. Frontend (React + Vite + TS + Tailwind; state: zustand slices)

- API client: `app/src/api/client.ts` uses `fetch` against `import.meta.env.VITE_API_BASE_URL ?? '/api/v1'`; `app/src/api/http.ts` has `get/post/patch/del` wrappers mapping `problem` JSON to thrown errors; types from `src/types/api.ts`. Legacy in-memory mock (`src/api/db.ts`) removed from prod path; test fixtures in `src/api/test-fixtures.ts`.
- AI proxy contract: browser calls `VITE_AI_PROXY_URL` (default `http://localhost:3001`); server-side `AI_PROXY_URL`/`AI_PROXY_PORT=3001`; `/api/v1/chat` router (openai ^4.77.0); locale namespace `agent.*` covers the chat widget (widgetTitle, placeholder, apiKey, model, enabled, clearChat, send, status…).
- Routing: locale-prefixed (`/{locale}/...`, e.g. `/en-US/automation-rules`) via `<LocaleLayout>`; sidebar groups (AppLayout):
  - **SOURCE**: Navigator, Catalog, Reservations (icon `Layers`)
  - **ENGAGE**: Campaigns, Automation Rules (icon `Sparkles`)
  - **RELATIONSHIPS**: Roasters, Sample Kits, Orders
  - **INTELLIGENCE**: Analytics, Webhooks
- Known pages: `CatalogPage`, `RoastersPage`, `OrdersPage`, `GrowthPage`, `CampaignsPage`, `AutomationRulesPage`, `SampleKitsPage`, `WebhooksPage`, `ReservationsPage`, Navigator (Origin Navigator), plus trust/document-verification UI (`trust.*` namespace: evidence, documentType, upload, acceptAndLink/reject) and curriculum/education UI (`curriculum.*` namespace: tracks, modules, progress, authoring).
- Stores/slices (zustand): `crm-slice` (roasters CRUD, anonymize, logIntervention, idempotency), `catalog-slice` (lots CRUD, retire, reserveLot — idempotent, no double-decrement, AL-CAT-1001 on insufficient), `campaigns-slice` (CRUD, activate/pause/retire, performance), `trust-slice`, `root-store.ts`.
- Growth dashboard widgets (`src/components/growth/`, test `growth-widgets.test.tsx`; i18n ns `growth`): **WTR** (Weekly Transacting Roasters, trailing 7-day + 4-week MA), **Kit Funnel** (Kit Sent → Delivered → Feedback → First Order), **CAC by Channel** (blended CAC vs $500 ceiling), **Churn Hazard Heatmap** (accounts by churn tier × segment), **K-Factor** (viral coefficient vs 0.6 target), **Campaign Lift** (Bayesian posterior probability vs control).
- Charts: recharts ^3.9.2; animations: framer-motion ^12.42.2; icons: lucide-react.
- Tests: vitest + Testing Library + jsdom; lint: oxlint (0 warnings/errors gate); build: `tsc -b && vite build`.

---

## 7. Design system essentials

- Brand/logo: **"Lot Compass"** logo system with co-branding rules (design-system/01-brand-identity.md); AL monogram: brass coffee-bean ellipse (rx:ry 24×16, rotated 30°, center-cut groove) with negative-space "AL" letters on an ink square field, 16% corner radius. Parent ODASI compass mark only in corporate/end-card contexts.
- Token values observed (from AL monogram SVG, citing 02-design-tokens.md §1.1):
  - `ink` = navy-700 = **#16323E** (brand static); dark-mode field inverts to parchment-100 **#F6F1E7**
  - `brass` = gold-500 = **rgb(201 163 74)**
  - `font.display` = `"Playfair Display", "Cormorant Garamond", Georgia, serif`
- Production-bible palette (motion/marketing contexts; cites same token spec): paper **#FBFAF6**, ink **#26201A**, green accent **#2F6B4A**, amber rim **#A8721F**, monospace counters JetBrains Mono.
- Token system: 170-token W3C DTCG `tokens.json` + Tailwind config, WCAG-annotated (full doc not in dump — **TBD by architect**). Component library: buttons, lot cards, SCA score badges, tables, charts.
- Voice/tone: specialty-literate always ("washed process at 1,900–2,200 masl," never "premium beans"); sensory over superlative; numbers before adjectives; honesty about scarcity (show real bag counts). Visual look: documentary honesty + data elegance; nothing that looks like a generic SaaS ad.

---

## 8. i18n

- Locales shipped (single JSON per locale, top-level namespaces): **en-US** (source of truth), **zh-CN**, **es-MX**, **pt-BR** — plus **vi-VN**, **de-DE**, **fr-FR** locale files exist in the dump and in `SUPPORTED_LOCALES` (7 locales: `['en-US','zh-CN','es-MX','pt-BR','vi-VN','de-DE','fr-FR']`). NOTE: expansion-pack overview says "four parity-checked locale JSONs (1,036 keys)" and CI validates the 4 core locales; the 7-locale set is the architecture target. Observed en-US file has 483 leaf keys.
- Framework: `react-i18next` with lazy namespaces; packages `i18next react-i18next i18next-http-backend i18next-browser-languagedetector`. Config: `fallbackLng: 'en-US'`, `nonExplicitSupportedLngs: false`, `load: 'currentOnly'`, `returnEmptyString: false`, `saveMissing: false`, backend `loadPath: '/locales/{{lng}}/{{ns}}.json'`, detection order `path > localStorage("auctum:locale") > navigator`. Routing: subpath `/{locale}/...`; invalid locale → 302 to detected best; `/` never 404s. Persist choice via `PATCH /api/users/me { preferred_locale }` (notification service reads this for email/SMS rendering).
- Namespaces observed in locale files (top-level keys): `common` (appName, tagline, nav, actions, buttons, states, labels, languageSwitcher, a11y, units, meta), `dashboard` (metrics, charts, benchmark, time, empty), `catalog` (sourcingObjective, goals, filters, lot, attributes, processMethods, certifications, origins, resultsSummary_one/_other, table), `campaigns` (sequence, steps, metrics, abTest, status, engagement, emails.alt001–005, emailFooter, sms, create/activate/retire), `growth` (wtr, kitFunnel, cacByChannel, hazardHeatmap, kFactor, campaignLift), `errors` (title, generic, unknown, codes.*, cta.*, insufficientInventory, idempotencyConflict), `roasters`, `orders`, `sampleKits`, `rules`, `webhooks` (create forms), `agent` (chat widget), `trust` (document verification), `referrals` (Give-a-Kit UI), `curriculum` (education tracks).
- i18n doc's preload set: `common` + `errors` preloaded; `catalog`/`dashboard`/`campaigns` lazy per route. Deploy splits each locale file's top-level namespaces into `/locales/<lng>/<ns>.json`.
- Parity rules (CI-gated, `scripts/validate_locale_files.py` = PR gate; `scripts/i18n_audit.py` = key-usage audit):
  - Plural-aware base-key parity vs en-US, zero missing/zero extra.
  - CLDR plural categories: en-US `{one,other}`; zh-CN `{other}`; es-MX/pt-BR `{one,many,other}` (vi-VN/fr-FR `{one,many,other}`, de-DE `{one,other}` per validator).
  - Placeholder-set parity per key: merge tags `{...}` and i18next vars `{{...}}` byte-identical to source.
  - Brand tokens **never translated**: `Auctum`, `Ledger` (also SCA, ESG, Q Grader, ALT-001–005, merge-tag names, URLs).
  - No key concatenation in code; unknown enum values render raw, not broken keys. No raw `error.message` to UI — map codes via `errors.codes.<CODE>`; covered codes: AUTH_SESSION_EXPIRED, AUTH_INVALID_CREDENTIALS, AUTH_FORBIDDEN, NET_OFFLINE, NET_TIMEOUT, RATE_LIMITED, VAL_REQUIRED_FIELD, VAL_INVALID_EMAIL, VAL_BUDGET_RANGE, LOT_NOT_FOUND, LOT_OUT_OF_STOCK, ORDER_FAILED, PAYMENT_DECLINED, IDEMPOTENCY_CONFLICT, SERVER_ERROR.
  - Length checks: subjects ≤60 chars (zh ≤30 CJK), preheaders ≤90, SMS ≤160 GSM-7 (zh UCS-2 → 70/segment). Dates/numbers/currency via Intl helpers only (`fmtNumber`, `fmtCurrency`, `fmtPricePerLb` = cents/100 + `/lb`, `fmtDate`, `fmtList`); currency stays USD. `{sca_cup_score}` one decimal max, never round up.
  - CI workflow `.github/workflows/i18n.yml`: JSON validity + validator + usage audit (missing keys block PR).
  - Compliance per market: US CAN-SPAM, zh-CN PIPL/Advertising Law (no absolute claims 最佳/第一/100%; SMS via 106 channel, 退订回T opt-out), es-MX LFPDPPP (ALTO), pt-BR LGPD (SAIR). Cadence: max 1 marketing email/72h/address; ALT-004 auto-suppresses when `{available_lbs}` < 500.

---

## Source map (driveupload IDs used per section)

- §1 Conventions: 264017 (rulings), 263967 (expansion overview), 264077 (.env contract), 264007/264013 (error codes, topics), 263975 (campaigns/merge tokens), 263977 (churn tiers), 263979 (referral), 263981 (economics/pricing), root CI guides (legacy superseded note)
- §2 Dependencies: 264075 (package-lock), 264017 (zod ruling), 263993 (@types/redis ruling), 264057 (i18n packages)
- §3 Compose: 263997 (task 2), 264011 (task 2 report), 264071 (nginx), root greensheet-docker-compose.prod.yml (legacy)
- §4 Schema: 263995 (task 3), 264003 (task 3 report), root task-1-brief.md + task-1-report.md (credential state machine), 263981/263975/263977 (accounts/coffee_lots/churn_interventions blueprint)
- §5 API: 264009 (task 5), 264007 (task 5 report), 264019 (task 4), 264001 (task 4 report), 263999 (task 6), 264013 (task 6 report), 264015 (task 1 skeleton), 264023 (client fix report)
- §6 Frontend: 264005 (task 7), 263989 (routing/nav), 264025 (slices tests), 264035 (en-US locale — growth/agent/trust/curriculum namespaces), 275317 (vitest results incl. growth-widgets)
- §7 Design: 263967 (Lot Compass, 170-token DTCG), 264083 (AL monogram SVG tokens), 263973 (production bible palette), 263981 (voice)
- §8 i18n: 264057 (architecture), 264029 (pipeline), 264031 (audit/CI + validator), 264049 (campaign localization), 264053/264055 (scripts), 264035/264037/264039/264041/264043/264045/264047 (locale JSONs: en-US, de-DE, vi-VN, fr-FR, zh-CN, es-MX, pt-BR — these are locale files, not vitest results)

**Explicit TBD-by-architect gaps:** full OpenAPI contract (paths/payload schemas beyond route list), per-endpoint auth scopes, cursor pagination, nginx `/api` reverse-proxy wiring, full 170-token design tokens JSON, `credential` table columns beyond `state_id`, migration orchestration service in compose, vi-VN/de-DE/fr-FR ship-readiness (architecture target vs 4-locale CI gate).
