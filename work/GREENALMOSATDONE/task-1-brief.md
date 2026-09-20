# Task 1: Define credential state machine schema

**Files:**
- Create: `app/server/db/migrations/20260913_01_credential_state_machine.sql`
- Modify: `app/server/db/schema.ts` (add state reference)
- Test: `tests/credential_state.test.ts`

**Interfaces:**
- Consumes: existing `credential` table, `credential_events` table.
- Produces: new `credential_states` table, foreign key `state_id` on `credential`, unit test verifying state transitions.

**Steps:**
- [ ] **Step 1:** Write migration to create `credential_states` table with columns `id` (PK), `name` (varchar not null), `description` (text), `created_at` (timestamp), `updated_at` (timestamp).
- [ ] **Step 2:** Insert initial rows: 'active' (description: "valid, not expiring"), 'expiring' (description: "within renewal window"), 'stale' (description: "earned against superseded SOP"), 'lapsed' (description: "expired or drift-suspended").
- [ ] **Step 3:** Alter `credential` table to add `state_id` integer column, not null, default 'active', foreign key referencing `credential_states(id)` with `ON DELETE RESTRICT`.
- [ ] **Step 4:** Add index on `credential.state_id`.
- [ ] **Step 5:** Write unit test `tests/credential_state.test.ts` that verifies:
  - New credential defaults to 'active'.
  - `renew` operation moves state to 'expiring'.
  - `drift_flagged` transition moves state to 'stale'.
  - `lapse` transition moves state to 'lapsed'.
- [ ] **Step 6:** Ensure migrations are idempotent (`CREATE TABLE IF NOT EXISTS`).