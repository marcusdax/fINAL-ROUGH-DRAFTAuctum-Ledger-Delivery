# Auctum Ledger Full-Stack Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Auctum Ledger migration by fixing backend service type mismatches, adding payment/business logic, wiring the ACTUM website to Ledger and Lotspace, verifying all locales and routes, and committing/pushing the changes.

**Architecture:** Express+TypeScript API on port 3001, React+Vite frontend on port 3000, in-memory/PostgreSQL dual-mode data layer, i18next locale routing, and Lotspace social endpoints under `/api/v1`.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS, Express 4, PostgreSQL, Redis, Kafka, Zustand, i18next, Vitest.

**Spec:** `BUILD-BRIEF.md` and `plan.md` in the workspace root.

## Global Constraints

- Keep `AL-*` error codes and `/api/v1` route prefix.
- Keep locale routing and supported locales: `en-US`, `zh-CN`, `es-MX`, `pt-BR`.
- Keep `AUTH_DISABLE=true` for local verification.
- Do not downgrade zod from `^4.4.3`.
- Do not remove existing working routes or data.
- Use TDD for new behavior and verify with build, lint, and tests before commit.

---

### Task 1: Fix backend service schema mismatches

**Files:**
- Modify: `server/services/connections/index.ts`
- Modify: `server/services/feeds/index.ts`
- Modify: `server/services/spaces/index.ts`

**Interfaces:**
- `connections` must use only `type: 'follow' | 'fan' | 'subscriber' | 'collector'` and `Date` timestamps.
- `feeds` must use `Date` timestamps.
- `spaces` must use only valid `archetype` values and `avatarUrl` instead of `logo_url`, with `Date` timestamps.

- [ ] Write or run the failing TypeScript check for each service file.
- [ ] Fix the seed data and types to match the schemas.
- [ ] Run `npx tsc --noEmit -p tsconfig.server.json` and confirm no service-file errors remain.
- [ ] Commit the schema fixes.

### Task 2: Add payment and business-logic endpoints

**Files:**
- Modify: `server/routes/orders.ts`
- Create: `server/routes/payments.ts`
- Modify: `server/routes/referrals.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- `POST /api/v1/payments/intents` returns a payment intent object with `id`, `amount_cents`, `currency`, `status`, `order_id`, `created_at`.
- `GET /api/v1/payments/:id` returns payment status.
- `POST /api/v1/payments/:id/confirm` finalizes a payment and updates the related order to `paid`.
- Referral completion must create or update a `reward_ledger` entry when a referral reaches `qualified`.

- [ ] Write failing tests for payment intent creation, payment status, and payment confirmation.
- [ ] Implement the minimal payment route and referral reward update.
- [ ] Run the relevant tests and confirm they pass.
- [ ] Commit the payment/business logic changes.

### Task 3: Verify frontend wiring and translations

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/api/client.ts`
- Modify: `src/i18n/index.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/TracksPage.tsx`

**Interfaces:**
- Frontend must call `/api/v1/dashboard` and `/api/v1/education/tracks` through the shared API client.
- `ACTUM` branding must be consistent across routes and copy.
- All supported locales must load without missing namespace errors.

- [ ] Confirm the frontend uses the correct API base URL.
- [ ] Confirm dashboard and tracks pages use the backend endpoints.
- [ ] Confirm locale files and routing work for `en-US`, `zh-CN`, `es-MX`, and `pt-BR`.
- [ ] Run the frontend build.
- [ ] Commit the frontend wiring changes.

### Task 4: Restart services and verify end-to-end

**Interfaces:**
- `http://localhost:3001/api/v1/health`
- `http://localhost:3001/api/v1/dashboard`
- `http://localhost:3001/api/v1/education/tracks`
- `http://localhost:3001/api/v1/spaces`
- `http://localhost:3001/api/v1/feeds`
- `http://localhost:3001/api/v1/connections`
- `http://localhost:3000/`

- [ ] Restart the Ledger server cleanly on port 3001.
- [ ] Confirm the ACTUM frontend is running on port 3000.
- [ ] Confirm all required API endpoints return 200 or the expected 404 problem response.
- [ ] Confirm the frontend renders without the “Ledger is unreachable” error.
- [ ] Commit the runtime verification changes if any are needed.

### Task 5: Run final verification and deliver

**Interfaces:**
- `npm run lint`
- `npm run build`
- `npm run test:run`
- `npx tsc --noEmit -p tsconfig.server.json`
- `git status`
- `git commit`
- `git push`

- [ ] Run all verification commands.
- [ ] Confirm no tests, build, or typecheck failures remain.
- [ ] Commit all changes with a single migration commit.
- [ ] Push the commit to the remote branch.
- [ ] Report the commit SHA and verification evidence.
