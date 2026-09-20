import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type RoasterRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, listEnvelope, singleEnvelope } from './helpers.js';

export const roastersRouter = Router();

const UPDATABLE_FIELDS = [
  'roaster_name',
  'segment',
  'status',
  'churn_risk_score',
  'ltv_cents',
  'cac_cents',
  'payback_months',
  'days_since_last_order',
  'billing_cycle',
  'billing_address',
  'primary_contact',
] as const;

roastersRouter.get('/roasters', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<RoasterRow>('SELECT * FROM roasters ORDER BY created_at ASC');
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.roasters));
  } catch (err) {
    next(err);
  }
});

roastersRouter.get('/roasters/:id', async (req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<RoasterRow>('SELECT * FROM roasters WHERE id = $1', [req.params.id]);
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.roasters.find((r) => r.id === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

roastersRouter.post('/roasters', async (req, res, next) => {
  try {
    const name = asString(req.body?.roaster_name);
    if (!name) {
      sendProblem(
        res,
        problem(400, 'AL-ROASTER-1002', 'roaster_name is required', [
          { field: 'roaster_name', code: 'required', message: 'roaster_name is required' },
        ]),
      );
      return;
    }
    const ts = new Date().toISOString();
    if (db.pg) {
      const rows = await query<RoasterRow>(
        `INSERT INTO roasters (roaster_name, segment, status, primary_contact)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          name,
          asString(req.body.segment) ?? 'micro',
          asString(req.body.status) ?? 'trial',
          req.body.primary_contact ? JSON.stringify(req.body.primary_contact) : null,
        ],
      );
      await emitEvent('al.crm.roaster_registered', rows[0].id, rows[0], 'al.crm.roaster_registered');
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    const row: RoasterRow = {
      id: crypto.randomUUID(),
      roaster_name: name,
      segment: asString(req.body.segment) ?? 'micro',
      status: asString(req.body.status) ?? 'trial',
      churn_risk_score: typeof req.body.churn_risk_score === 'number' ? req.body.churn_risk_score : null,
      ltv_cents: null,
      cac_cents: null,
      payback_months: null,
      days_since_last_order: null,
      total_revenue_cents: 0,
      total_orders: 0,
      billing_cycle: asString(req.body.billing_cycle) ?? null,
      last_activity_at: ts,
      business_registration: asString(req.body.business_registration) ?? null,
      tax_id: null,
      billing_address: asString(req.body.billing_address) ?? null,
      primary_contact: req.body.primary_contact ?? null,
      interventions: [],
      created_at: ts,
      updated_at: ts,
    };
    memory.roasters.push(row);
    await emitEvent('al.crm.roaster_registered', row.id, row, 'al.crm.roaster_registered');
    res.status(201).json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

roastersRouter.patch('/roasters/:id', async (req, res, next) => {
  try {
    const updates = UPDATABLE_FIELDS.filter((f) => req.body?.[f] !== undefined);
    if (updates.length === 0) {
      sendProblem(res, problem(400, 'AL-ROASTER-1002', 'No fields to update'));
      return;
    }
    if (db.pg) {
      const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const rows = await query<RoasterRow>(
        `UPDATE roasters SET ${setClause} WHERE id = $1 RETURNING *`,
        [req.params.id, ...updates.map((f) => req.body[f])],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.roasters.find((r) => r.id === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
      return;
    }
    for (const f of updates) {
      (row as unknown as Record<string, unknown>)[f] = req.body[f];
    }
    row.updated_at = new Date().toISOString();
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

roastersRouter.post('/roasters/:id/interventions', async (req, res, next) => {
  try {
    const type = asString(req.body?.type);
    if (!type) {
      sendProblem(
        res,
        problem(400, 'AL-ROASTER-1002', 'type is required', [
          { field: 'type', code: 'required', message: 'intervention type is required' },
        ]),
      );
      return;
    }
    const intervention = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type,
      outcome: asString(req.body.outcome) ?? null,
      assigned_to: asString(req.body.assigned_to) ?? null,
      risk_score_before:
        typeof req.body.risk_score_before === 'number' ? req.body.risk_score_before : null,
      notes: asString(req.body.notes) ?? null,
    };
    if (db.pg) {
      const rows = await query<RoasterRow>(
        `UPDATE roasters
         SET interventions = COALESCE(interventions, '[]'::jsonb) || $2::jsonb
         WHERE id = $1 RETURNING *`,
        [req.params.id, JSON.stringify([intervention])],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
        return;
      }
      res.status(201).json(singleEnvelope({ roaster: rows[0], intervention }));
      return;
    }
    const row = memory.roasters.find((r) => r.id === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${req.params.id} not found`));
      return;
    }
    row.interventions.push(intervention);
    row.updated_at = new Date().toISOString();
    res.status(201).json(singleEnvelope({ roaster: row, intervention }));
  } catch (err) {
    next(err);
  }
});
