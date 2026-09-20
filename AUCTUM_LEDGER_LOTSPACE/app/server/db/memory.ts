import crypto from 'node:crypto';
import type { CredentialState } from '../lib/credentialStateMachine.js';

/**
 * In-memory dataset used by routes when DATABASE_URL is unset (dev/test).
 * Mirrors the shapes of the base schema (brief §4); pg mode reads/writes the
 * real tables. Seeded with the same fixtures as db/seed.ts so the dev server
 * is useful out of the box.
 */

export interface RoasterRow {
  id: string;
  roaster_name: string;
  segment: string;
  status: string;
  churn_risk_score: number | null;
  ltv_cents: number | null;
  cac_cents: number | null;
  payback_months: number | null;
  days_since_last_order: number | null;
  total_revenue_cents: number | null;
  total_orders: number | null;
  billing_cycle: string | null;
  last_activity_at: string | null;
  business_registration: string | null;
  tax_id: string | null;
  billing_address: string | null;
  primary_contact: Record<string, unknown> | null;
  interventions: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CatalogLotRow {
  id: string;
  origin: string;
  varietal: string | null;
  processing_method: string | null;
  elevation: number | null;
  cup_score: number | null;
  price_per_lb_cents: number;
  cost_per_lb_cents: number;
  available_quantity_lbs: number;
  total_production_lbs: number;
  esg_score: number | null;
  logistics_score: number | null;
  certifications: unknown;
  flavorNotes: string[] | null;
  sensory_profile: Record<string, unknown> | null;
  port_of_origin: string | null;
  estimated_arrival: string | null;
  status: string;
  last_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  target_audience: Record<string, unknown> | null;
  rule_codes: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleRow {
  id: string;
  rule_code: string;
  campaign_id: string | null;
  rule_name: string;
  trigger_event: string;
  conditions_json: Record<string, unknown>;
  version: number;
  status: string;
  actions: unknown[];
  created_at: string;
  updated_at: string;
}

export interface SampleKitRow {
  id: string;
  roaster_id: string | null;
  status: string;
  lots: unknown[];
  tracking_number: string | null;
  carrier: string | null;
  requested_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  feedback_token: string;
  feedback: Record<string, unknown> | null;
  feedback_submitted_at: string | null;
  temporal_workflow_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  account_id: string;
  status: string;
  line_items: unknown[];
  final_total_cents: number;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookSubscriptionRow {
  id: string;
  url: string;
  events: string[];
  status: string;
  signing_secret: string;
  created_at: string;
}

export interface ReferralCodeRow {
  id: string;
  account_id: string;
  code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referee_id: string | null;
  ref_code: string;
  status: string;
  channel: string | null;
  clicked_at: string | null;
  signed_up_at: string | null;
  kit_requested_at: string | null;
  kit_delivered_at: string | null;
  feedback_submitted_at: string | null;
  first_order_delivered_at: string | null;
  qualified_at: string | null;
  clawed_back_at: string | null;
  review_status: string;
  created_at: string;
}

export interface RewardLedgerRow {
  id: string;
  account_id: string;
  referral_id: string | null;
  type: string;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
  posted_at: string | null;
  clawed_back_at: string | null;
}

export interface CredentialRow {
  id: string;
  user_id: string;
  credential_type: string;
  state: CredentialState;
  issued_at: string;
  expires_at: string | null;
  issued_by_user_id: string | null;
  content_version_set_json: unknown;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialEventRow {
  id: string;
  credential_id: string;
  event_type: string;
  occurred_at: string;
  actor_user_id: string | null;
  reason: string | null;
  evidence_json: unknown;
  created_at: string;
}

export interface MemoryStore {
  roasters: RoasterRow[];
  catalogLots: CatalogLotRow[];
  campaigns: CampaignRow[];
  automationRules: AutomationRuleRow[];
  sampleKits: SampleKitRow[];
  orders: OrderRow[];
  webhookSubscriptions: WebhookSubscriptionRow[];
  referralCodes: ReferralCodeRow[];
  referrals: ReferralRow[];
  rewardLedger: RewardLedgerRow[];
  credentials: CredentialRow[];
  credentialEvents: CredentialEventRow[];
}

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

export const R1 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0001';
export const R2 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0002';
export const R3 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0003';
export const R4 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0004';
export const R5 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0005';
export const R6 = '3f6b2a40-9f1c-4c3d-9c2a-7f2f0a1b0006';

export function createMemoryStore(): MemoryStore {
  const ts = now();
  const roasters: RoasterRow[] = [
    {
      id: R1, roaster_name: 'Ember & Oak Roasting Co.', segment: 'micro', status: 'active',
      churn_risk_score: 0.18, ltv_cents: 2140000, cac_cents: 31200, payback_months: 2,
      days_since_last_order: 6, total_revenue_cents: 642000, total_orders: 9,
      billing_cycle: 'monthly', last_activity_at: daysAgo(1),
      business_registration: 'US-OR-8841203', tax_id: '93-1147062',
      billing_address: '414 SE Salmon St, Portland, OR 97214',
      primary_contact: { first_name: 'Mara', last_name: 'Quintana', email: 'mara@emberandoak.example' },
      interventions: [], created_at: daysAgo(210), updated_at: ts,
    },
    {
      id: R2, roaster_name: 'Kope Terroir', segment: 'boutique', status: 'active',
      churn_risk_score: 0.41, ltv_cents: 9860000, cac_cents: 178000, payback_months: 4,
      days_since_last_order: 18, total_revenue_cents: 3286000, total_orders: 22,
      billing_cycle: 'monthly', last_activity_at: daysAgo(3),
      business_registration: 'US-CA-5519827', tax_id: '47-2098156',
      billing_address: '88 Minna St, San Francisco, CA 94105',
      primary_contact: { first_name: 'Theo', last_name: 'Anand', email: 'theo@kopeterroir.example' },
      interventions: [], created_at: daysAgo(340), updated_at: ts,
    },
    {
      id: R3, roaster_name: 'Meridian Roast Works', segment: 'commercial', status: 'active',
      churn_risk_score: 0.62, ltv_cents: 74200000, cac_cents: 901000, payback_months: 7,
      days_since_last_order: 31, total_revenue_cents: 24800000, total_orders: 61,
      billing_cycle: 'annual', last_activity_at: daysAgo(9),
      business_registration: 'US-IL-3320914', tax_id: '36-4482710',
      billing_address: '1200 W Fulton Market, Chicago, IL 60607',
      primary_contact: { first_name: 'Priya', last_name: 'Raghavan', email: 'priya@meridianroast.example' },
      interventions: [{ at: daysAgo(12), type: 'email_campaign', outcome: 'opened', assigned_to: 'cs-west' }],
      created_at: daysAgo(500), updated_at: ts,
    },
    {
      id: R4, roaster_name: 'Casa Brasa Microlotes', segment: 'micro', status: 'trial',
      churn_risk_score: 0.74, ltv_cents: null, cac_cents: 39800, payback_months: null,
      days_since_last_order: 52, total_revenue_cents: 0, total_orders: 0,
      billing_cycle: 'monthly', last_activity_at: daysAgo(21),
      business_registration: 'MX-MTY-77120', tax_id: 'CBM-210915-AX4',
      billing_address: 'Calzada del Valle 412, San Pedro Garza García, NL',
      primary_contact: { first_name: 'Luisa', last_name: 'Ferrer', email: 'luisa@casabrasa.example' },
      interventions: [{ at: daysAgo(5), type: 'phone_call', outcome: 'follow_up_scheduled', assigned_to: 'cs-latam' }],
      created_at: daysAgo(58), updated_at: ts,
    },
    {
      id: R5, roaster_name: 'Đắk Lắk Craft Roasters', segment: 'boutique', status: 'active',
      churn_risk_score: 0.29, ltv_cents: 5120000, cac_cents: 181000, payback_months: 5,
      days_since_last_order: 11, total_revenue_cents: 1874000, total_orders: 14,
      billing_cycle: 'monthly', last_activity_at: daysAgo(2),
      business_registration: 'VN-BUON-031772', tax_id: '6001772041',
      billing_address: '14 Nguyễn Chí Thanh, Buôn Ma Thuột, Đắk Lắk',
      primary_contact: { first_name: 'Linh', last_name: 'Trần', email: 'linh@daklakcraft.example' },
      interventions: [], created_at: daysAgo(260), updated_at: ts,
    },
    {
      id: R6, roaster_name: 'Nordlicht Rösterei', segment: 'commercial', status: 'active',
      churn_risk_score: 0.55, ltv_cents: 41800000, cac_cents: 895000, payback_months: 8,
      days_since_last_order: 24, total_revenue_cents: 15200000, total_orders: 44,
      billing_cycle: 'annual', last_activity_at: daysAgo(6),
      business_registration: 'DE-HH-HRB-188402', tax_id: 'DE304118227',
      billing_address: 'Speicherstadt Kaffeelager 7, 20457 Hamburg',
      primary_contact: { first_name: 'Jonas', last_name: 'Weber', email: 'jonas@nordlicht.example' },
      interventions: [], created_at: daysAgo(430), updated_at: ts,
    },
  ];

  const catalogLots: CatalogLotRow[] = [
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a1', origin: 'Ethiopia — Guji, Hambela',
      varietal: 'Kurume, Dega heirloom', processing_method: 'washed', elevation: 2100,
      cup_score: 87.5, price_per_lb_cents: 642, cost_per_lb_cents: 388,
      available_quantity_lbs: 18480, total_production_lbs: 26400,
      esg_score: 0.86, logistics_score: 0.72,
      certifications: ['organic', 'rainforest_alliance'],
      flavorNotes: ['jasmine', 'bergamot', 'apricot', 'black tea'],
      sensory_profile: { acidity: 8.5, body: 6.5, sweetness: 8.0, aftertaste: 7.75 },
      port_of_origin: 'Djibouti', estimated_arrival: daysAhead(34).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(2), created_at: daysAgo(60), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a2', origin: 'Colombia — Huila, Pitalito',
      varietal: 'Pink Bourbon', processing_method: 'washed', elevation: 1750,
      cup_score: 86.25, price_per_lb_cents: 598, cost_per_lb_cents: 351,
      available_quantity_lbs: 9240, total_production_lbs: 13200,
      esg_score: 0.81, logistics_score: 0.84,
      certifications: ['fair_trade'],
      flavorNotes: ['red cherry', 'panela', 'cacao nib'],
      sensory_profile: { acidity: 7.75, body: 7.5, sweetness: 8.25, aftertaste: 7.5 },
      port_of_origin: 'Buenaventura', estimated_arrival: daysAhead(21).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(1), created_at: daysAgo(75), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a3', origin: 'Kenya — Nyeri, Mt. Kenya slopes',
      varietal: 'SL28, SL34', processing_method: 'washed (double fermentation)', elevation: 1850,
      cup_score: 88.0, price_per_lb_cents: 786, cost_per_lb_cents: 502,
      available_quantity_lbs: 4620, total_production_lbs: 6600,
      esg_score: 0.78, logistics_score: 0.69,
      certifications: [],
      flavorNotes: ['blackcurrant', 'grapefruit', 'brown sugar'],
      sensory_profile: { acidity: 9.0, body: 7.0, sweetness: 8.0, aftertaste: 8.25 },
      port_of_origin: 'Mombasa', estimated_arrival: daysAhead(47).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(4), created_at: daysAgo(40), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a4', origin: 'Brazil — Cerrado Mineiro, Patrocínio',
      varietal: 'Yellow Catuaí', processing_method: 'natural', elevation: 1150,
      cup_score: 84.0, price_per_lb_cents: 412, cost_per_lb_cents: 236,
      available_quantity_lbs: 39600, total_production_lbs: 52800,
      esg_score: 0.74, logistics_score: 0.9,
      certifications: ['rainforest_alliance', 'cerrado_mineiro_do'],
      flavorNotes: ['hazelnut', 'milk chocolate', 'dried fig'],
      sensory_profile: { acidity: 6.0, body: 8.0, sweetness: 7.75, aftertaste: 7.0 },
      port_of_origin: 'Santos', estimated_arrival: daysAhead(15).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(1), created_at: daysAgo(90), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a5', origin: 'Guatemala — Antigua Valley',
      varietal: 'Bourbon, Villa Sarchí', processing_method: 'washed', elevation: 1500,
      cup_score: 85.5, price_per_lb_cents: 534, cost_per_lb_cents: 318,
      available_quantity_lbs: 13200, total_production_lbs: 19800,
      esg_score: 0.8, logistics_score: 0.82,
      certifications: ['genuine_antigua'],
      flavorNotes: ['toffee', 'orange zest', 'spice'],
      sensory_profile: { acidity: 7.5, body: 7.75, sweetness: 7.75, aftertaste: 7.5 },
      port_of_origin: 'Puerto Quetzal', estimated_arrival: daysAhead(27).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(3), created_at: daysAgo(55), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a6', origin: 'Peru — Cajamarca, Jaén',
      varietal: 'Typica, Caturra', processing_method: 'washed', elevation: 1900,
      cup_score: 85.75, price_per_lb_cents: 488, cost_per_lb_cents: 279,
      available_quantity_lbs: 6600, total_production_lbs: 11000,
      esg_score: 0.88, logistics_score: 0.66,
      certifications: ['organic', 'fair_trade'],
      flavorNotes: ['green apple', 'caramel', 'floral'],
      sensory_profile: { acidity: 7.75, body: 7.0, sweetness: 8.0, aftertaste: 7.25 },
      port_of_origin: 'Callao', estimated_arrival: daysAhead(39).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(5), created_at: daysAgo(48), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a7', origin: 'Vietnam — Đắk Lắk, Ea H\'leo',
      varietal: 'Catimor (fine robusta)', processing_method: 'natural', elevation: 800,
      cup_score: 82.5, price_per_lb_cents: 318, cost_per_lb_cents: 174,
      available_quantity_lbs: 52800, total_production_lbs: 79200,
      esg_score: 0.7, logistics_score: 0.88,
      certifications: ['utz'],
      flavorNotes: ['dark chocolate', 'molasses', 'cedar'],
      sensory_profile: { acidity: 5.5, body: 8.75, sweetness: 7.0, aftertaste: 6.75 },
      port_of_origin: 'Ho Chi Minh City', estimated_arrival: daysAhead(52).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(6), created_at: daysAgo(70), updated_at: ts,
    },
    {
      id: '7a1c0e10-2b4a-4f0a-8a11-0000000000a8', origin: 'Panama — Boquete, Volcán Barú',
      varietal: 'Geisha', processing_method: 'washed', elevation: 1950,
      cup_score: 91.25, price_per_lb_cents: 2340, cost_per_lb_cents: 1680,
      available_quantity_lbs: 330, total_production_lbs: 440,
      esg_score: 0.9, logistics_score: 0.75,
      certifications: [],
      flavorNotes: ['jasmine', 'lychee', 'peach', 'honey'],
      sensory_profile: { acidity: 9.25, body: 7.25, sweetness: 9.0, aftertaste: 9.0 },
      port_of_origin: 'Balboa', estimated_arrival: daysAhead(18).slice(0, 10),
      status: 'active', last_updated_at: daysAgo(1), created_at: daysAgo(30), updated_at: ts,
    },
  ];

  const campaigns: CampaignRow[] = [
    { id: 'c5a1a100-0000-4000-8000-000000000001', slug: 'alt-001-first-crack', name: 'ALT-001 First Crack',
      description: 'Day 0 — welcome + kit shipped notification with {kit_tracking_url}.',
      status: 'active', version: 3, target_audience: { sequence_day: 0, segment: ['micro', 'boutique'] },
      rule_codes: ['AL-RULE-001'], created_at: daysAgo(120), updated_at: ts },
    { id: 'c5a1a100-0000-4000-8000-000000000002', slug: 'alt-002-the-cupping', name: 'ALT-002 The Cupping',
      description: 'Day 3 — cupping notes for {origin} ({sca_cup_score} pts, {process_method}).',
      status: 'active', version: 2, target_audience: { sequence_day: 3, segment: ['micro', 'boutique'] },
      rule_codes: ['AL-RULE-002'], created_at: daysAgo(120), updated_at: ts },
    { id: 'c5a1a100-0000-4000-8000-000000000003', slug: 'alt-003-the-shortlist', name: 'ALT-003 The Shortlist',
      description: 'Day 7 — peer-adoption shortlist with {peer_roaster_name} and {shortlist_url}.',
      status: 'active', version: 2, target_audience: { sequence_day: 7 },
      rule_codes: [], created_at: daysAgo(118), updated_at: ts },
    { id: 'c5a1a100-0000-4000-8000-000000000004', slug: 'alt-004-second-cup', name: 'ALT-004 Second Cup',
      description: 'Day 12 — reorder nudge; auto-suppressed when {available_lbs} < 500.',
      status: 'active', version: 1, target_audience: { sequence_day: 12 },
      rule_codes: ['AL-RULE-003'], created_at: daysAgo(115), updated_at: ts },
    { id: 'c5a1a100-0000-4000-8000-000000000005', slug: 'alt-005-the-regular', name: 'ALT-005 The Regular',
      description: 'Day 21 — subscription conversion with {savings_estimate}.',
      status: 'active', version: 1, target_audience: { sequence_day: 21 },
      rule_codes: [], created_at: daysAgo(110), updated_at: ts },
  ];

  const automationRules: AutomationRuleRow[] = [
    { id: 'aa000000-0000-4000-8000-000000000001', rule_code: 'AL-RULE-001',
      campaign_id: campaigns[0].id, rule_name: 'Kit delivered → start First Crack',
      trigger_event: 'sample_kit.delivered', conditions_json: { kit_status: 'delivered' },
      version: 1, status: 'armed', actions: [{ type: 'SEND_EMAIL', template: 'alt-001' }],
      created_at: daysAgo(120), updated_at: ts },
    { id: 'aa000000-0000-4000-8000-000000000002', rule_code: 'AL-RULE-002',
      campaign_id: campaigns[1].id, rule_name: 'Feedback submitted → send Cupping notes',
      trigger_event: 'feedback.submitted', conditions_json: {},
      version: 2, status: 'armed', actions: [{ type: 'SEND_EMAIL', template: 'alt-002' }],
      created_at: daysAgo(118), updated_at: ts },
    { id: 'aa000000-0000-4000-8000-000000000003', rule_code: 'AL-RULE-003',
      campaign_id: campaigns[3].id, rule_name: 'Low stock → halt ALT-004 for lot',
      trigger_event: 'order.created', conditions_json: { available_lbs_below: 500 },
      version: 1, status: 'armed',
      actions: [{ type: 'EXECUTE_CAMPAIGN_HALT', campaign: 'ALT-004' }, { type: 'UPDATE_CRM_LIFECYCLE', stage: 'low_inventory' }],
      created_at: daysAgo(100), updated_at: ts },
  ];

  const sampleKits: SampleKitRow[] = [
    { id: '5b000000-0000-4000-8000-000000000001', roaster_id: R4, status: 'shipped',
      lots: [{ lot_id: catalogLots[0].id, grams: 250 }, { lot_id: catalogLots[3].id, grams: 250 }],
      tracking_number: '1Z88A4W2031147', carrier: 'UPS',
      requested_at: daysAgo(9), shipped_at: daysAgo(6), delivered_at: null,
      feedback_token: crypto.randomUUID(), feedback: null, feedback_submitted_at: null,
      temporal_workflow_id: 'kit-fulfillment-8841', created_at: daysAgo(9), updated_at: ts },
    { id: '5b000000-0000-4000-8000-000000000002', roaster_id: R2, status: 'delivered',
      lots: [{ lot_id: catalogLots[2].id, grams: 250 }],
      tracking_number: '1Z88A4W2035521', carrier: 'UPS',
      requested_at: daysAgo(20), shipped_at: daysAgo(17), delivered_at: daysAgo(14),
      feedback_token: crypto.randomUUID(),
      feedback: { rating: 4, notes: 'Nyeri lot: blackcurrant acidity holds up on espresso.' },
      feedback_submitted_at: daysAgo(11),
      temporal_workflow_id: 'kit-fulfillment-8790', created_at: daysAgo(20), updated_at: ts },
  ];

  const orders: OrderRow[] = [
    { id: '0de00000-0000-4000-8000-000000000001', account_id: R1, status: 'delivered',
      line_items: [{ lot_id: catalogLots[0].id, quantity_lbs: 660, price_per_lb_cents: 642 }],
      final_total_cents: 423720, invoice_number: 'INV-2026-0412', created_at: daysAgo(40), updated_at: ts },
    { id: '0de00000-0000-4000-8000-000000000002', account_id: R3, status: 'pending',
      line_items: [{ lot_id: catalogLots[3].id, quantity_lbs: 2640, price_per_lb_cents: 412 }],
      final_total_cents: 1087680, invoice_number: 'INV-2026-0477', created_at: daysAgo(4), updated_at: ts },
  ];

  const referralCodes: ReferralCodeRow[] = [
    { id: 'efc00000-0000-4000-8000-000000000001', account_id: R1, code: 'GS-RVR-001',
      status: 'active', created_at: daysAgo(150), updated_at: ts },
    { id: 'efc00000-0000-4000-8000-000000000002', account_id: R2, code: 'GS-RVR-002',
      status: 'active', created_at: daysAgo(150), updated_at: ts },
  ];

  const referrals: ReferralRow[] = [
    { id: 'ef000000-0000-4000-8000-000000000001', referrer_id: R1, referee_id: R4,
      ref_code: 'GS-RVR-001', status: 'qualified', channel: 'email',
      clicked_at: daysAgo(60), signed_up_at: daysAgo(58), kit_requested_at: daysAgo(9),
      kit_delivered_at: null, feedback_submitted_at: null, first_order_delivered_at: null,
      qualified_at: daysAgo(55), clawed_back_at: null, review_status: 'approved',
      created_at: daysAgo(60) },
    { id: 'ef000000-0000-4000-8000-000000000002', referrer_id: R2, referee_id: null,
      ref_code: 'GS-RVR-002', status: 'clicked', channel: 'qr',
      clicked_at: daysAgo(7), signed_up_at: null, kit_requested_at: null,
      kit_delivered_at: null, feedback_submitted_at: null, first_order_delivered_at: null,
      qualified_at: null, clawed_back_at: null, review_status: 'pending_review',
      created_at: daysAgo(7) },
  ];

  const rewardLedger: RewardLedgerRow[] = [
    { id: 'ad000000-0000-4000-8000-000000000001', account_id: R1,
      referral_id: referrals[0].id, type: 'referral_reward', amount_cents: 15000,
      status: 'posted', description: 'Give a Kit, Get a Bag — qualified referral roast credit',
      created_at: daysAgo(55), posted_at: daysAgo(55), clawed_back_at: null },
  ];

  const credentials: CredentialRow[] = [
    { id: 'cd000000-0000-4000-8000-000000000001', user_id: R1, credential_type: 'green_buyer_level_1',
      state: 'active', issued_at: daysAgo(120), expires_at: daysAhead(245),
      issued_by_user_id: null, content_version_set_json: { sop: '2026.2' },
      external_ref: 'SCA-GB-10412', created_at: daysAgo(120), updated_at: ts },
    { id: 'cd000000-0000-4000-8000-000000000002', user_id: R2, credential_type: 'q_grader_arabica',
      state: 'active', issued_at: daysAgo(300), expires_at: daysAhead(65),
      issued_by_user_id: null, content_version_set_json: { sop: '2025.4' },
      external_ref: 'CQI-Q-88271', created_at: daysAgo(300), updated_at: ts },
    { id: 'cd000000-0000-4000-8000-000000000003', user_id: R3, credential_type: 'roaster_certification',
      state: 'expiring', issued_at: daysAgo(340), expires_at: daysAhead(25),
      issued_by_user_id: null, content_version_set_json: { sop: '2025.4' },
      external_ref: null, created_at: daysAgo(340), updated_at: ts },
    { id: 'cd000000-0000-4000-8000-000000000004', user_id: R5, credential_type: 'cupping_protocols',
      state: 'stale', issued_at: daysAgo(500), expires_at: daysAgo(135),
      issued_by_user_id: null, content_version_set_json: { sop: '2024.1 (superseded)' },
      external_ref: null, created_at: daysAgo(500), updated_at: ts },
    { id: 'cd000000-0000-4000-8000-000000000005', user_id: R6, credential_type: 'green_buyer_level_2',
      state: 'lapsed', issued_at: daysAgo(760), expires_at: daysAgo(395),
      issued_by_user_id: null, content_version_set_json: { sop: '2023.3' },
      external_ref: null, created_at: daysAgo(760), updated_at: ts },
    { id: 'cd000000-0000-4000-8000-000000000006', user_id: R4, credential_type: 'sample_evaluation',
      state: 'active', issued_at: daysAgo(45), expires_at: daysAhead(320),
      issued_by_user_id: null, content_version_set_json: { sop: '2026.2' },
      external_ref: null, created_at: daysAgo(45), updated_at: ts },
  ];

  return {
    roasters,
    catalogLots,
    campaigns,
    automationRules,
    sampleKits,
    orders,
    webhookSubscriptions: [],
    referralCodes,
    referrals,
    rewardLedger,
    credentials,
    credentialEvents: [],
  };
}

/** Shared in-memory store for dual-mode routes. */
export const memory = createMemoryStore();
