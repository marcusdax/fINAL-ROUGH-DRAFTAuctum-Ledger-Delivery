/**
 * Deterministic growth-series fixtures for the dashboard widgets.
 * Figures honor the economics guardrails (brief §1): blended CAC $378 vs.
 * $500 hard cap, referral CAC ≤ $200, churn hazard line 0.70, kit funnel
 * anchored to the 1,000-kit legacy baseline, K-factor target 0.6.
 */

export interface WeeklyPoint {
  week: string
  value: number
}

/** Trailing 12 weeks of weekly transacting roasters + 4-week moving average. */
export const WTR_SERIES: Array<{ week: string; wtr: number; ma4: number }> = [
  { week: 'W27', wtr: 118, ma4: 112.5 },
  { week: 'W28', wtr: 124, ma4: 116.0 },
  { week: 'W29', wtr: 121, ma4: 118.25 },
  { week: 'W30', wtr: 133, ma4: 124.0 },
  { week: 'W31', wtr: 141, ma4: 129.75 },
  { week: 'W32', wtr: 138, ma4: 133.25 },
  { week: 'W33', wtr: 146, ma4: 139.5 },
  { week: 'W34', wtr: 152, ma4: 144.25 },
  { week: 'W35', wtr: 149, ma4: 146.25 },
  { week: 'W36', wtr: 158, ma4: 151.25 },
  { week: 'W37', wtr: 164, ma4: 155.75 },
  { week: 'W38', wtr: 171, ma4: 160.5 },
]

/** Kit funnel against the 1,000-kit legacy baseline (7.2% kit→order). */
export const KIT_FUNNEL: Array<{ stage: 'sent' | 'delivered' | 'feedback' | 'firstOrder'; count: number }> = [
  { stage: 'sent', count: 1000 },
  { stage: 'delivered', count: 868 },
  { stage: 'feedback', count: 421 },
  { stage: 'firstOrder', count: 238 },
]

export const CAC_HARD_CAP = 500
export const CAC_BY_CHANNEL: Array<{ channel: string; cac: number }> = [
  { channel: 'Referral', cac: 184 },
  { channel: 'Organic / content', cac: 296 },
  { channel: 'Events & cuppings', cac: 412 },
  { channel: 'Outbound', cac: 497 },
  { channel: 'Blended', cac: 378 },
]

/** Churn hazard: account counts by churn tier (T0–T3) × segment. */
export const HAZARD_TIERS = ['T0', 'T1', 'T2', 'T3'] as const
export const HAZARD_SEGMENTS = ['micro', 'boutique', 'commercial', 'supply'] as const
export const HAZARD_GRID: Record<(typeof HAZARD_SEGMENTS)[number], Record<(typeof HAZARD_TIERS)[number], number>> = {
  micro: { T0: 212, T1: 64, T2: 18, T3: 6 },
  boutique: { T0: 96, T1: 31, T2: 12, T3: 4 },
  commercial: { T0: 27, T1: 11, T2: 6, T3: 3 },
  supply: { T0: 9, T1: 4, T2: 2, T3: 1 },
}

export const K_FACTOR_TARGET = 0.6
export const K_FACTOR_SERIES: Array<{ week: string; k: number }> = [
  { week: 'W27', k: 0.31 },
  { week: 'W28', k: 0.33 },
  { week: 'W29', k: 0.35 },
  { week: 'W30', k: 0.34 },
  { week: 'W31', k: 0.38 },
  { week: 'W32', k: 0.41 },
  { week: 'W33', k: 0.4 },
  { week: 'W34', k: 0.44 },
  { week: 'W35', k: 0.46 },
  { week: 'W36', k: 0.45 },
  { week: 'W37', k: 0.49 },
  { week: 'W38', k: 0.52 },
]

/** Bayesian posterior probability that each ALT campaign beats control. */
export const CAMPAIGN_LIFT: Array<{ campaign: string; posterior: number }> = [
  { campaign: 'ALT-001', posterior: 0.82 },
  { campaign: 'ALT-002', posterior: 0.91 },
  { campaign: 'ALT-003', posterior: 0.67 },
  { campaign: 'ALT-004', posterior: 0.95 },
  { campaign: 'ALT-005', posterior: 0.74 },
]
