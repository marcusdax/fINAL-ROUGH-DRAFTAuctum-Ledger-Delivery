-- up
-- Auctum Ledger platform base schema (brief §4). Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS telemetry;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- public.roasters
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_name TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'micro',
  status TEXT NOT NULL DEFAULT 'trial',
  churn_risk_score NUMERIC(3,2),
  ltv_cents BIGINT,
  cac_cents BIGINT,
  payback_months INT,
  days_since_last_order INT,
  total_revenue_cents BIGINT,
  total_orders INT,
  billing_cycle TEXT,
  last_activity_at TIMESTAMPTZ,
  business_registration TEXT UNIQUE,
  tax_id TEXT,
  billing_address TEXT,
  primary_contact JSONB,
  interventions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.catalog_lots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin TEXT NOT NULL,
  varietal TEXT,
  processing_method TEXT,
  elevation INT,
  cup_score NUMERIC(4,1),
  price_per_lb_cents INT NOT NULL,
  cost_per_lb_cents INT NOT NULL,
  available_quantity_lbs INT NOT NULL DEFAULT 0,
  total_production_lbs INT NOT NULL DEFAULT 0,
  esg_score NUMERIC(3,2),
  logistics_score NUMERIC(3,2),
  certifications JSONB,
  "flavorNotes" TEXT[],
  sensory_profile JSONB,
  port_of_origin TEXT,
  estimated_arrival DATE,
  status TEXT NOT NULL DEFAULT 'active',
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  target_audience JSONB,
  rule_codes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.automation_rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT UNIQUE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id),
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions_json JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'armed',
  actions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.sample_kits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sample_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID REFERENCES public.roasters(id),
  status TEXT NOT NULL DEFAULT 'requested',
  lots JSONB NOT NULL,
  tracking_number TEXT,
  carrier TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  feedback_token UUID UNIQUE DEFAULT gen_random_uuid(),
  feedback JSONB,
  feedback_submitted_at TIMESTAMPTZ,
  temporal_workflow_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  line_items JSONB NOT NULL,
  final_total_cents BIGINT NOT NULL,
  invoice_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.webhook_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  signing_secret TEXT NOT NULL DEFAULT ('whsec_' || encode(gen_random_bytes(16), 'hex')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- public.referrals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.roasters(id),
  referee_id UUID REFERENCES public.roasters(id),
  ref_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  channel TEXT,
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  kit_requested_at TIMESTAMPTZ,
  kit_delivered_at TIMESTAMPTZ,
  feedback_submitted_at TIMESTAMPTZ,
  first_order_delivered_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  clawed_back_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_ref_code ON public.referrals(ref_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- ---------------------------------------------------------------------------
-- public.reward_ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.roasters(id),
  referral_id UUID REFERENCES public.referrals(id),
  type TEXT NOT NULL,
  amount_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ,
  clawed_back_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reward_ledger_account_id ON public.reward_ledger(account_id);

-- ---------------------------------------------------------------------------
-- public.outbox_events (transactional outbox for Kafka relay)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  key TEXT,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_events_unpublished
  ON public.outbox_events(created_at) WHERE NOT published;

-- ---------------------------------------------------------------------------
-- updated_at triggers (idempotent via DROP IF EXISTS first)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS roasters_updated_at ON public.roasters;
CREATE TRIGGER roasters_updated_at BEFORE UPDATE ON public.roasters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS catalog_lots_updated_at ON public.catalog_lots;
CREATE TRIGGER catalog_lots_updated_at BEFORE UPDATE ON public.catalog_lots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sample_kits_updated_at ON public.sample_kits;
CREATE TRIGGER sample_kits_updated_at BEFORE UPDATE ON public.sample_kits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS referral_codes_updated_at ON public.referral_codes;
CREATE TRIGGER referral_codes_updated_at BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- down
DROP TRIGGER IF EXISTS referral_codes_updated_at ON public.referral_codes;
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS sample_kits_updated_at ON public.sample_kits;
DROP TRIGGER IF EXISTS automation_rules_updated_at ON public.automation_rules;
DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS catalog_lots_updated_at ON public.catalog_lots;
DROP TRIGGER IF EXISTS roasters_updated_at ON public.roasters;

DROP TABLE IF EXISTS public.outbox_events;
DROP TABLE IF EXISTS public.reward_ledger;
DROP TABLE IF EXISTS public.referrals;
DROP TABLE IF EXISTS public.referral_codes;
DROP TABLE IF EXISTS public.webhook_subscriptions;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.sample_kits;
DROP TABLE IF EXISTS public.automation_rules;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.catalog_lots;
DROP TABLE IF EXISTS public.roasters;

DROP FUNCTION IF EXISTS set_updated_at();
DROP SCHEMA IF EXISTS telemetry;
