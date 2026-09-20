import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import {
  memory,
  type ReferralCodeRow,
  type ReferralRow,
  type RewardLedgerRow,
} from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, singleEnvelope } from './helpers.js';

export const referralsRouter = Router();

/** Referrer reward per qualified referral: $150 roast credit (brief §1). */
export const REFERRAL_REWARD_CENTS = 15000;

async function findCode(code: string): Promise<ReferralCodeRow | undefined> {
  if (db.pg) {
    const rows = await query<ReferralCodeRow>(
      "SELECT * FROM referral_codes WHERE code = $1 AND status = 'active'",
      [code],
    );
    return rows[0];
  }
  return memory.referralCodes.find((c) => c.code === code && c.status === 'active');
}

referralsRouter.get('/referrals/code/:code', async (req, res, next) => {
  try {
    const row = await findCode(req.params.code);
    if (!row) {
      sendProblem(res, problem(404, 'AL-REF-1001', `Referral code ${req.params.code} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

referralsRouter.get('/referrals/stats', async (_req, res, next) => {
  try {
    if (db.pg) {
      const byStatus = await query<{ status: string; n: string }>(
        'SELECT status, COUNT(*)::text AS n FROM referrals GROUP BY status',
      );
      const rewards = await query<{ total: string | null }>(
        "SELECT COALESCE(SUM(amount_cents), 0)::text AS total FROM reward_ledger WHERE status = 'posted'",
      );
      const codes = await query<{ n: string }>(
        "SELECT COUNT(*)::text AS n FROM referral_codes WHERE status = 'active'",
      );
      res.json(
        singleEnvelope({
          active_codes: Number.parseInt(codes[0]?.n ?? '0', 10),
          referrals_by_status: Object.fromEntries(
            byStatus.map((r) => [r.status, Number.parseInt(r.n, 10)]),
          ),
          rewards_posted_cents: Number.parseInt(rewards[0]?.total ?? '0', 10),
        }),
      );
      return;
    }
    const byStatus: Record<string, number> = {};
    for (const r of memory.referrals) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    res.json(
      singleEnvelope({
        active_codes: memory.referralCodes.filter((c) => c.status === 'active').length,
        referrals_by_status: byStatus,
        rewards_posted_cents: memory.rewardLedger
          .filter((r) => r.status === 'posted')
          .reduce((sum, r) => sum + r.amount_cents, 0),
      }),
    );
  } catch (err) {
    next(err);
  }
});

referralsRouter.post('/referrals/recordClick', async (req, res, next) => {
  try {
    const code = asString(req.body?.code) ?? asString(req.body?.ref_code);
    if (!code) {
      sendProblem(
        res,
        problem(400, 'AL-REF-1001', 'code is required', [
          { field: 'code', code: 'required', message: 'code is required' },
        ]),
      );
      return;
    }
    const codeRow = await findCode(code);
    if (!codeRow) {
      sendProblem(res, problem(404, 'AL-REF-1001', `Referral code ${code} not found`));
      return;
    }
    const channel = asString(req.body.channel) ?? null;
    const ts = new Date().toISOString();
    if (db.pg) {
      const rows = await query<ReferralRow>(
        `INSERT INTO referrals (referrer_id, ref_code, status, channel, clicked_at)
         VALUES ($1, $2, 'clicked', $3, now()) RETURNING *`,
        [codeRow.account_id, code, channel],
      );
      await emitEvent('al.referral.clicked', rows[0].id, rows[0], 'al.referral.clicked');
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    const referral: ReferralRow = {
      id: crypto.randomUUID(),
      referrer_id: codeRow.account_id,
      referee_id: null,
      ref_code: code,
      status: 'clicked',
      channel,
      clicked_at: ts,
      signed_up_at: null,
      kit_requested_at: null,
      kit_delivered_at: null,
      feedback_submitted_at: null,
      first_order_delivered_at: null,
      qualified_at: null,
      clawed_back_at: null,
      review_status: 'pending_review',
      created_at: ts,
    };
    memory.referrals.push(referral);
    await emitEvent('al.referral.clicked', referral.id, referral, 'al.referral.clicked');
    res.status(201).json(singleEnvelope(referral));
  } catch (err) {
    next(err);
  }
});

referralsRouter.post('/referrals/qualify', async (req, res, next) => {
  try {
    const referralId = asString(req.body?.referral_id);
    if (!referralId) {
      sendProblem(
        res,
        problem(400, 'AL-REF-1001', 'referral_id is required', [
          { field: 'referral_id', code: 'required', message: 'referral_id is required' },
        ]),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<ReferralRow>(
        `UPDATE referrals
         SET status = 'qualified', qualified_at = now(), review_status = 'approved'
         WHERE id = $1 AND clawed_back_at IS NULL RETURNING *`,
        [referralId],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-REF-1001', `Referral ${referralId} not found`));
        return;
      }
      const reward = await query<RewardLedgerRow>(
        `INSERT INTO reward_ledger (account_id, referral_id, type, amount_cents, status, description, posted_at)
         VALUES ($1, $2, 'referral_reward', $3, 'posted', $4, now()) RETURNING *`,
        [
          rows[0].referrer_id,
          referralId,
          REFERRAL_REWARD_CENTS,
          'Give a Kit, Get a Bag — qualified referral roast credit',
        ],
      );
      await emitEvent('al.referral.qualified', referralId, { referral: rows[0], reward: reward[0] }, 'al.referral.qualified');
      res.json(singleEnvelope({ referral: rows[0], reward: reward[0] }));
      return;
    }
    const referral = memory.referrals.find((r) => r.id === referralId && !r.clawed_back_at);
    if (!referral) {
      sendProblem(res, problem(404, 'AL-REF-1001', `Referral ${referralId} not found`));
      return;
    }
    const ts = new Date().toISOString();
    referral.status = 'qualified';
    referral.qualified_at = ts;
    referral.review_status = 'approved';
    const reward: RewardLedgerRow = {
      id: crypto.randomUUID(),
      account_id: referral.referrer_id,
      referral_id: referral.id,
      type: 'referral_reward',
      amount_cents: REFERRAL_REWARD_CENTS,
      status: 'posted',
      description: 'Give a Kit, Get a Bag — qualified referral roast credit',
      created_at: ts,
      posted_at: ts,
      clawed_back_at: null,
    };
    memory.rewardLedger.push(reward);
    await emitEvent('al.referral.qualified', referral.id, { referral, reward }, 'al.referral.qualified');
    res.json(singleEnvelope({ referral, reward }));
  } catch (err) {
    next(err);
  }
});

/** Claw back posted rewards for every referral made under a code. */
referralsRouter.post('/referrals/:refCode/refund', async (req, res, next) => {
  try {
    const refCode = req.params.refCode;
    if (db.pg) {
      const referrals = await query<ReferralRow>(
        `UPDATE referrals SET status = 'clawed_back', clawed_back_at = now()
         WHERE ref_code = $1 AND clawed_back_at IS NULL RETURNING *`,
        [refCode],
      );
      if (referrals.length === 0) {
        sendProblem(res, problem(404, 'AL-REF-1001', `No active referrals for code ${refCode}`));
        return;
      }
      const rewards = await query<RewardLedgerRow>(
        `UPDATE reward_ledger SET status = 'clawed_back', clawed_back_at = now()
         WHERE referral_id = ANY($1::uuid[]) AND status = 'posted' RETURNING *`,
        [referrals.map((r) => r.id)],
      );
      await emitEvent(
        'al.referral.clawed_back',
        refCode,
        { ref_code: refCode, referrals, rewards },
        'al.referral.clawed_back',
      );
      res.json(singleEnvelope({ ref_code: refCode, referrals, rewards }));
      return;
    }
    const referrals = memory.referrals.filter((r) => r.ref_code === refCode && !r.clawed_back_at);
    if (referrals.length === 0) {
      sendProblem(res, problem(404, 'AL-REF-1001', `No active referrals for code ${refCode}`));
      return;
    }
    const ts = new Date().toISOString();
    for (const r of referrals) {
      r.status = 'clawed_back';
      r.clawed_back_at = ts;
    }
    const ids = new Set(referrals.map((r) => r.id));
    const rewards = memory.rewardLedger.filter((r) => r.referral_id && ids.has(r.referral_id) && r.status === 'posted');
    for (const r of rewards) {
      r.status = 'clawed_back';
      r.clawed_back_at = ts;
    }
    await emitEvent(
      'al.referral.clawed_back',
      refCode,
      { ref_code: refCode, referrals, rewards },
      'al.referral.clawed_back',
    );
    res.json(singleEnvelope({ ref_code: refCode, referrals, rewards }));
  } catch (err) {
    next(err);
  }
});
