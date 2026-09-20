/**
 * API entity types — mirror the PostgreSQL columns in
 * server/db/migrations/202609110000_platform__base.sql (brief §4).
 * Field names stay snake_case, matching the wire format; `flavorNotes`
 * keeps its exact (camelCase) column name from the schema.
 */

/** RFC 9457 Problem Details as emitted by server/lib/problem.ts */
export interface Problem {
  type: string // https://api.auctumledger.io/problems/<code>
  title: string // the AL-* code
  status: number
  code: string
  detail?: string
  errors?: Array<{ field: string; code: string; message: string }>
  traceId?: string
}

export interface ListEnvelope<T> {
  data: T[]
  page: { nextCursor: string | null; hasMore: boolean }
}

export interface ItemEnvelope<T> {
  data: T
}

export type RoasterSegment = 'micro' | 'boutique' | 'commercial' | 'supply'

export interface Roaster {
  id: string
  roaster_name: string
  segment: RoasterSegment
  status: string
  churn_risk_score: number | null
  ltv_cents: number | null
  cac_cents: number | null
  payback_months: number | null
  days_since_last_order: number | null
  total_revenue_cents: number | null
  total_orders: number | null
  billing_cycle: string | null
  last_activity_at: string | null
  created_at: string
  updated_at: string
  business_registration: string | null
  tax_id: string | null
  billing_address: string | null
  primary_contact: { name?: string; email?: string; phone?: string } | null
  interventions: Intervention[] | null
}

export interface Intervention {
  id?: string
  intervention_type: string
  note?: string
  outcome?: string
  risk_score_before?: number
  assigned_to?: string
  created_at?: string
}

export interface Lot {
  id: string
  origin: string
  region?: string | null
  varietal: string | null
  processing_method: string | null
  elevation: number | null // masl
  cup_score: number | null // SCA, one decimal max
  price_per_lb_cents: number
  cost_per_lb_cents: number
  available_quantity_lbs: number
  total_production_lbs: number
  esg_score: number | null
  logistics_score: number | null
  certifications: string[] | null
  flavorNotes: string[] | null
  sensory_profile: Record<string, number> | null
  port_of_origin: string | null
  estimated_arrival: string | null
  status: string
  last_updated_at: string | null
}

export interface Reservation {
  id: string
  lot_id: string
  roaster_id: string
  quantity_lbs: number
  status: string
  created_at: string
}

export interface Campaign {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  version: number
  target_audience: Record<string, unknown> | null
  rule_codes: string[] | null
  created_at: string
  updated_at: string
}

export interface AutomationRule {
  id: string
  rule_code: string
  campaign_id: string | null
  rule_name: string
  trigger_event: string
  conditions_json: Record<string, unknown>
  version: number
  status: string
  actions: Array<{ type: string; [key: string]: unknown }>
  created_at: string
  updated_at: string
}

export type SampleKitStatus = 'requested' | 'shipped' | 'delivered' | 'feedback'

export interface SampleKit {
  id: string
  roaster_id: string
  roaster_name?: string
  status: SampleKitStatus | string
  lots: Array<{ lot_id?: string; origin?: string; varietal?: string }>
  tracking_number: string | null
  carrier: string | null
  requested_at: string
  shipped_at: string | null
  delivered_at: string | null
  feedback: Record<string, unknown> | null
  feedback_submitted_at: string | null
}

export interface Order {
  id: string
  account_id: string
  roaster_name?: string
  status: string
  line_items: Array<{
    lot_id: string
    origin?: string
    varietal?: string
    quantity_lbs: number
    price_per_lb_cents: number
  }>
  final_total_cents: number
  invoice_number: string | null
  created_at: string
  updated_at: string
}

export interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  status: string
  signing_secret?: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Education module (credential state machine, spec §5.2)
// ---------------------------------------------------------------------------

export const CREDENTIAL_STATES = ['active', 'expiring', 'stale', 'lapsed'] as const
export type CredentialStateName = (typeof CREDENTIAL_STATES)[number]

export const CREDENTIAL_EVENTS = ['renew', 'drift_flagged', 'lapse'] as const
export type CredentialEventName = (typeof CREDENTIAL_EVENTS)[number]

export interface Credential {
  id: string
  holder_name: string
  credential_type: string
  issuer: string | null
  state_id: number
  /** Joined from credential_states.name by GET /credentials */
  state: CredentialStateName
  issued_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface CredentialEvent {
  id: string
  credential_id: string
  event: CredentialEventName | string
  from_state?: CredentialStateName | string | null
  to_state?: CredentialStateName | string | null
  reason: string | null
  actor?: string | null
  created_at: string
  /** Raw server row fields (snake_case audit schema); normalized by the client. */
  event_type?: CredentialEventName | string
  actor_user_id?: string | null
  occurred_at?: string
}

export interface CurriculumModule {
  id: string
  title: string
  summary?: string
  lessons: number
  duration_minutes?: number
  progress: number // 0–1
  status: 'not_started' | 'in_progress' | 'completed' | 'locked'
}

export interface CurriculumTrack {
  id: string
  /** i18n key under curriculum.tracks.* */
  key: 'quality' | 'compliance' | 'finance' | 'logistics'
  region?: string
  level?: string
  modules: CurriculumModule[]
}

// ---------------------------------------------------------------------------
// AI chat proxy
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  data?: {
    message?: string
    reply?: string
    content?: string
    choices?: { message?: { content?: string } }[]
  }
  message?: string
  reply?: string
}
