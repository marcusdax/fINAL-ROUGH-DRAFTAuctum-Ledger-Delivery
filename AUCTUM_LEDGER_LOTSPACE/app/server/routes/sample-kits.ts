import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type SampleKitRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, listEnvelope, singleEnvelope } from './helpers.js';

export const sampleKitsRouter = Router();

sampleKitsRouter.get('/sample-kits', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<SampleKitRow>('SELECT * FROM sample_kits ORDER BY requested_at DESC');
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.sampleKits));
  } catch (err) {
    next(err);
  }
});

sampleKitsRouter.post('/sample-kits/request', async (req, res, next) => {
  try {
    const roasterId = asString(req.body?.roaster_id);
    const lots = Array.isArray(req.body?.lots) ? req.body.lots : null;
    if (!roasterId || !lots || lots.length === 0) {
      sendProblem(
        res,
        problem(400, 'AL-SMP-1001', 'roaster_id and a non-empty lots array are required', [
          ...(roasterId
            ? []
            : [{ field: 'roaster_id', code: 'required', message: 'roaster_id is required' }]),
          ...(lots && lots.length > 0
            ? []
            : [{ field: 'lots', code: 'required', message: 'lots must be a non-empty array' }]),
        ]),
      );
      return;
    }
    if (db.pg) {
      const roaster = await query('SELECT id FROM roasters WHERE id = $1', [roasterId]);
      if (roaster.length === 0) {
        sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${roasterId} not found`));
        return;
      }
      const rows = await query<SampleKitRow>(
        `INSERT INTO sample_kits (roaster_id, lots) VALUES ($1, $2) RETURNING *`,
        [roasterId, JSON.stringify(lots)],
      );
      await emitEvent('al.sample_kit.requested', rows[0].id, rows[0], 'al.sample_kit.requested');
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    if (!memory.roasters.some((r) => r.id === roasterId)) {
      sendProblem(res, problem(404, 'AL-ROASTER-1001', `Roaster ${roasterId} not found`));
      return;
    }
    const ts = new Date().toISOString();
    const row: SampleKitRow = {
      id: crypto.randomUUID(),
      roaster_id: roasterId,
      status: 'requested',
      lots,
      tracking_number: null,
      carrier: null,
      requested_at: ts,
      shipped_at: null,
      delivered_at: null,
      feedback_token: crypto.randomUUID(),
      feedback: null,
      feedback_submitted_at: null,
      temporal_workflow_id: null,
      created_at: ts,
      updated_at: ts,
    };
    memory.sampleKits.push(row);
    await emitEvent('al.sample_kit.requested', row.id, row, 'al.sample_kit.requested');
    res.status(201).json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

sampleKitsRouter.post('/sample-kits/:id/feedback', async (req, res, next) => {
  try {
    const feedback = req.body?.feedback;
    if (feedback === null || typeof feedback !== 'object' || Array.isArray(feedback)) {
      sendProblem(
        res,
        problem(400, 'AL-SMP-1001', 'feedback object is required', [
          { field: 'feedback', code: 'required', message: 'feedback must be an object' },
        ]),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<SampleKitRow>(
        `UPDATE sample_kits
         SET feedback = $2, feedback_submitted_at = now()
         WHERE id = $1 RETURNING *`,
        [req.params.id, JSON.stringify(feedback)],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-SMP-1001', `Sample kit ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.sampleKits.find((k) => k.id === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-SMP-1001', `Sample kit ${req.params.id} not found`));
      return;
    }
    row.feedback = feedback;
    row.feedback_submitted_at = new Date().toISOString();
    row.updated_at = row.feedback_submitted_at;
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});
