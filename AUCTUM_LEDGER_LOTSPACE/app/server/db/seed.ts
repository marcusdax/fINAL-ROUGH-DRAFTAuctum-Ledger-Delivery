import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

/**
 * Seed fixtures (contract §3): 6 roasters across micro/boutique/commercial
 * segments with varied churn risk, 8 specialty-literate catalog lots,
 * campaigns ALT-001…005 (day offsets 0/3/7/12/21), 3 automation rules,
 * 2 sample kits, 2 orders, 2 referral codes, and 6 credentials spanning all
 * four credential states. Idempotent via fixed UUIDs + ON CONFLICT.
 */

const SEED_SQL = `
INSERT INTO roasters (id, roaster_name, segment, status, churn_risk_score, ltv_cents, cac_cents,
  payback_months, days_since_last_order, total_revenue_cents, total_orders, billing_cycle,
  last_activity_at, business_registration, tax_id, billing_address, primary_contact, interventions)
VALUES
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001', 'Ember & Oak Roasting Co.', 'micro', 'active', 0.18,
   2140000, 31200, 2, 6, 642000, 9, 'monthly', now() - interval '1 day',
   'US-OR-8841203', '93-1147062', '414 SE Salmon St, Portland, OR 97214',
   '{"first_name":"Mara","last_name":"Quintana","email":"mara@emberandoak.example"}', '[]'),
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002', 'Kope Terroir', 'boutique', 'active', 0.41,
   9860000, 178000, 4, 18, 3286000, 22, 'monthly', now() - interval '3 days',
   'US-CA-5519827', '47-2098156', '88 Minna St, San Francisco, CA 94105',
   '{"first_name":"Theo","last_name":"Anand","email":"theo@kopeterroir.example"}', '[]'),
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0003', 'Meridian Roast Works', 'commercial', 'active', 0.62,
   74200000, 901000, 7, 31, 24800000, 61, 'annual', now() - interval '9 days',
   'US-IL-3320914', '36-4482710', '1200 W Fulton Market, Chicago, IL 60607',
   '{"first_name":"Priya","last_name":"Raghavan","email":"priya@meridianroast.example"}',
   '[{"at":"2026-08-30T00:00:00Z","type":"email_campaign","outcome":"opened","assigned_to":"cs-west"}]'),
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0004', 'Casa Brasa Microlotes', 'micro', 'trial', 0.74,
   NULL, 39800, NULL, 52, 0, 0, 'monthly', now() - interval '21 days',
   'MX-MTY-77120', 'CBM-210915-AX4', 'Calzada del Valle 412, San Pedro Garza García, NL',
   '{"first_name":"Luisa","last_name":"Ferrer","email":"luisa@casabrasa.example"}',
   '[{"at":"2026-09-06T00:00:00Z","type":"phone_call","outcome":"follow_up_scheduled","assigned_to":"cs-latam"}]'),
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0005', 'Đắk Lắk Craft Roasters', 'boutique', 'active', 0.29,
   5120000, 181000, 5, 11, 1874000, 14, 'monthly', now() - interval '2 days',
   'VN-BUON-031772', '6001772041', '14 Nguyễn Chí Thanh, Buôn Ma Thuột, Đắk Lắk',
   '{"first_name":"Linh","last_name":"Trần","email":"linh@daklakcraft.example"}', '[]'),
  ('3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0006', 'Nordlicht Rösterei', 'commercial', 'active', 0.55,
   41800000, 895000, 8, 24, 15200000, 44, 'annual', now() - interval '6 days',
   'DE-HH-HRB-188402', 'DE304118227', 'Speicherstadt Kaffeelager 7, 20457 Hamburg',
   '{"first_name":"Jonas","last_name":"Weber","email":"jonas@nordlicht.example"}', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_lots (id, origin, varietal, processing_method, elevation, cup_score,
  price_per_lb_cents, cost_per_lb_cents, available_quantity_lbs, total_production_lbs,
  esg_score, logistics_score, certifications, "flavorNotes", sensory_profile,
  port_of_origin, estimated_arrival, status, last_updated_at)
VALUES
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a1', 'Ethiopia — Guji, Hambela', 'Kurume, Dega heirloom',
   'washed', 2100, 87.5, 642, 388, 18480, 26400, 0.86, 0.72,
   '["organic","rainforest_alliance"]', '{jasmine,bergamot,"apricot","black tea"}',
   '{"acidity":8.5,"body":6.5,"sweetness":8.0,"aftertaste":7.75}',
   'Djibouti', current_date + 34, 'active', now() - interval '2 days'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a2', 'Colombia — Huila, Pitalito', 'Pink Bourbon',
   'washed', 1750, 86.25, 598, 351, 9240, 13200, 0.81, 0.84,
   '["fair_trade"]', '{"red cherry",panela,"cacao nib"}',
   '{"acidity":7.75,"body":7.5,"sweetness":8.25,"aftertaste":7.5}',
   'Buenaventura', current_date + 21, 'active', now() - interval '1 day'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a3', 'Kenya — Nyeri, Mt. Kenya slopes', 'SL28, SL34',
   'washed (double fermentation)', 1850, 88.0, 786, 502, 4620, 6600, 0.78, 0.69,
   '[]', '{blackcurrant,grapefruit,"brown sugar"}',
   '{"acidity":9.0,"body":7.0,"sweetness":8.0,"aftertaste":8.25}',
   'Mombasa', current_date + 47, 'active', now() - interval '4 days'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a4', 'Brazil — Cerrado Mineiro, Patrocínio', 'Yellow Catuaí',
   'natural', 1150, 84.0, 412, 236, 39600, 52800, 0.74, 0.9,
   '["rainforest_alliance","cerrado_mineiro_do"]', '{hazelnut,"milk chocolate","dried fig"}',
   '{"acidity":6.0,"body":8.0,"sweetness":7.75,"aftertaste":7.0}',
   'Santos', current_date + 15, 'active', now() - interval '1 day'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a5', 'Guatemala — Antigua Valley', 'Bourbon, Villa Sarchí',
   'washed', 1500, 85.5, 534, 318, 13200, 19800, 0.8, 0.82,
   '["genuine_antigua"]', '{toffee,"orange zest",spice}',
   '{"acidity":7.5,"body":7.75,"sweetness":7.75,"aftertaste":7.5}',
   'Puerto Quetzal', current_date + 27, 'active', now() - interval '3 days'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a6', 'Peru — Cajamarca, Jaén', 'Typica, Caturra',
   'washed', 1900, 85.75, 488, 279, 6600, 11000, 0.88, 0.66,
   '["organic","fair_trade"]', '{"green apple",caramel,floral}',
   '{"acidity":7.75,"body":7.0,"sweetness":8.0,"aftertaste":7.25}',
   'Callao', current_date + 39, 'active', now() - interval '5 days'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a7', 'Vietnam — Đắk Lắk, Ea H''leo', 'Catimor (fine robusta)',
   'natural', 800, 82.5, 318, 174, 52800, 79200, 0.7, 0.88,
   '["utz"]', '{"dark chocolate",molasses,cedar}',
   '{"acidity":5.5,"body":8.75,"sweetness":7.0,"aftertaste":6.75}',
   'Ho Chi Minh City', current_date + 52, 'active', now() - interval '6 days'),
  ('7a1c0e10-2b4a-4f0a-8a11-0000000000a8', 'Panama — Boquete, Volcán Barú', 'Geisha',
   'washed', 1950, 91.25, 2340, 1680, 330, 440, 0.9, 0.75,
   '[]', '{jasmine,lychee,peach,honey}',
   '{"acidity":9.25,"body":7.25,"sweetness":9.0,"aftertaste":9.0}',
   'Balboa', current_date + 18, 'active', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaigns (id, slug, name, description, status, version, target_audience, rule_codes)
VALUES
  ('c5a1a100-0000-4000-8000-000000000001', 'alt-001-first-crack', 'ALT-001 First Crack',
   'Day 0 — welcome + kit shipped notification with {kit_tracking_url}.', 'active', 3,
   '{"sequence_day":0,"segment":["micro","boutique"]}', '{AL-RULE-001}'),
  ('c5a1a100-0000-4000-8000-000000000002', 'alt-002-the-cupping', 'ALT-002 The Cupping',
   'Day 3 — cupping notes for {origin} ({sca_cup_score} pts, {process_method}).', 'active', 2,
   '{"sequence_day":3,"segment":["micro","boutique"]}', '{AL-RULE-002}'),
  ('c5a1a100-0000-4000-8000-000000000003', 'alt-003-the-shortlist', 'ALT-003 The Shortlist',
   'Day 7 — peer-adoption shortlist with {peer_roaster_name} and {shortlist_url}.', 'active', 2,
   '{"sequence_day":7}', '{}'),
  ('c5a1a100-0000-4000-8000-000000000004', 'alt-004-second-cup', 'ALT-004 Second Cup',
   'Day 12 — reorder nudge; auto-suppressed when {available_lbs} < 500.', 'active', 1,
   '{"sequence_day":12}', '{AL-RULE-003}'),
  ('c5a1a100-0000-4000-8000-000000000005', 'alt-005-the-regular', 'ALT-005 The Regular',
   'Day 21 — subscription conversion with {savings_estimate}.', 'active', 1,
   '{"sequence_day":21}', '{}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO automation_rules (id, rule_code, campaign_id, rule_name, trigger_event,
  conditions_json, version, status, actions)
VALUES
  ('aa000000-0000-4000-8000-000000000001', 'AL-RULE-001', 'c5a1a100-0000-4000-8000-000000000001',
   'Kit delivered → start First Crack', 'sample_kit.delivered', '{"kit_status":"delivered"}',
   1, 'armed', '[{"type":"SEND_EMAIL","template":"alt-001"}]'),
  ('aa000000-0000-4000-8000-000000000002', 'AL-RULE-002', 'c5a1a100-0000-4000-8000-000000000002',
   'Feedback submitted → send Cupping notes', 'feedback.submitted', '{}',
   2, 'armed', '[{"type":"SEND_EMAIL","template":"alt-002"}]'),
  ('aa000000-0000-4000-8000-000000000003', 'AL-RULE-003', 'c5a1a100-0000-4000-8000-000000000004',
   'Low stock → halt ALT-004 for lot', 'order.created', '{"available_lbs_below":500}',
   1, 'armed', '[{"type":"EXECUTE_CAMPAIGN_HALT","campaign":"ALT-004"},{"type":"UPDATE_CRM_LIFECYCLE","stage":"low_inventory"}]')
ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO sample_kits (id, roaster_id, status, lots, tracking_number, carrier,
  requested_at, shipped_at, delivered_at, feedback, feedback_submitted_at, temporal_workflow_id)
VALUES
  ('5b000000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0004', 'shipped',
   '[{"lot_id":"7a1c0e10-2b4a-4f0a-8a11-0000000000a1","grams":250},{"lot_id":"7a1c0e10-2b4a-4f0a-8a11-0000000000a4","grams":250}]',
   '1Z88A4W2031147', 'UPS', now() - interval '9 days', now() - interval '6 days', NULL,
   NULL, NULL, 'kit-fulfillment-8841'),
  ('5b000000-0000-4000-8000-000000000002', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002', 'delivered',
   '[{"lot_id":"7a1c0e10-2b4a-4f0a-8a11-0000000000a3","grams":250}]',
   '1Z88A4W2035521', 'UPS', now() - interval '20 days', now() - interval '17 days',
   now() - interval '14 days',
   '{"rating":4,"notes":"Nyeri lot: blackcurrant acidity holds up on espresso."}',
   now() - interval '11 days', 'kit-fulfillment-8790')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, account_id, status, line_items, final_total_cents, invoice_number, created_at)
VALUES
  ('0de00000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001', 'delivered',
   '[{"lot_id":"7a1c0e10-2b4a-4f0a-8a11-0000000000a1","quantity_lbs":660,"price_per_lb_cents":642}]',
   423720, 'INV-2026-0412', now() - interval '40 days'),
  ('0de00000-0000-4000-8000-000000000002', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0003', 'pending',
   '[{"lot_id":"7a1c0e10-2b4a-4f0a-8a11-0000000000a4","quantity_lbs":2640,"price_per_lb_cents":412}]',
   1087680, 'INV-2026-0477', now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO referral_codes (id, account_id, code, status, created_at)
VALUES
  ('efc00000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001', 'GS-RVR-001',
   'active', now() - interval '150 days'),
  ('efc00000-0000-4000-8000-000000000002', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002', 'GS-RVR-002',
   'active', now() - interval '150 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO referrals (id, referrer_id, referee_id, ref_code, status, channel,
  clicked_at, signed_up_at, kit_requested_at, qualified_at, review_status, created_at)
VALUES
  ('ef000000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001',
   '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0004', 'GS-RVR-001', 'qualified', 'email',
   now() - interval '60 days', now() - interval '58 days', now() - interval '9 days',
   now() - interval '55 days', 'approved', now() - interval '60 days'),
  ('ef000000-0000-4000-8000-000000000002', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002',
   NULL, 'GS-RVR-002', 'clicked', 'qr',
   now() - interval '7 days', NULL, NULL, NULL, 'pending_review', now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reward_ledger (id, account_id, referral_id, type, amount_cents, status,
  description, created_at, posted_at)
VALUES
  ('ad000000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001',
   'ef000000-0000-4000-8000-000000000001', 'referral_reward', 15000, 'posted',
   'Give a Kit, Get a Bag — qualified referral roast credit',
   now() - interval '55 days', now() - interval '55 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO credential (id, user_id, credential_type, state_id, issued_at, expires_at,
  content_version_set_json, external_ref)
VALUES
  ('cd000000-0000-4000-8000-000000000001', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001', 'green_buyer_level_1',
   (SELECT id FROM credential_states WHERE name = 'active'),
   now() - interval '120 days', now() + interval '245 days', '{"sop":"2026.2"}', 'SCA-GB-10412'),
  ('cd000000-0000-4000-8000-000000000002', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002', 'q_grader_arabica',
   (SELECT id FROM credential_states WHERE name = 'active'),
   now() - interval '300 days', now() + interval '65 days', '{"sop":"2025.4"}', 'CQI-Q-88271'),
  ('cd000000-0000-4000-8000-000000000003', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0003', 'roaster_certification',
   (SELECT id FROM credential_states WHERE name = 'expiring'),
   now() - interval '340 days', now() + interval '25 days', '{"sop":"2025.4"}', NULL),
  ('cd000000-0000-4000-8000-000000000004', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0005', 'cupping_protocols',
   (SELECT id FROM credential_states WHERE name = 'stale'),
   now() - interval '500 days', now() - interval '135 days', '{"sop":"2024.1 (superseded)"}', NULL),
  ('cd000000-0000-4000-8000-000000000005', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0006', 'green_buyer_level_2',
   (SELECT id FROM credential_states WHERE name = 'lapsed'),
   now() - interval '760 days', now() - interval '395 days', '{"sop":"2023.3"}', NULL),
  ('cd000000-0000-4000-8000-000000000006', '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0004', 'sample_evaluation',
   (SELECT id FROM credential_states WHERE name = 'active'),
   now() - interval '45 days', now() + interval '320 days', '{"sop":"2026.2"}', NULL)
ON CONFLICT (id) DO NOTHING;
`;

export async function runSeed(): Promise<void> {
  if (!db.pg) {
    throw new Error('DATABASE_URL is not set; cannot seed');
  }
  const client = await db.pg.connect();
  try {
    await client.query('BEGIN');
    await client.query(SEED_SQL);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  runSeed()
    .then(async () => {
      console.log('[seed] done');
      await db.pg?.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[seed] failed:', err);
      await db.pg?.end().catch(() => undefined);
      process.exit(1);
    });
}
