import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type CampaignRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, listEnvelope, singleEnvelope } from './helpers.js';

export const campaignsRouter = Router();

campaignsRouter.get('/campaigns', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<CampaignRow>('SELECT * FROM campaigns ORDER BY created_at ASC');
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.campaigns));
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get('/campaigns/:id', async (req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<CampaignRow>(
        'SELECT * FROM campaigns WHERE id = $1 OR slug = $1',
        [req.params.id],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-CMP-1001', `Campaign ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.campaigns.find((c) => c.id === req.params.id || c.slug === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-CMP-1001', `Campaign ${req.params.id} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

campaignsRouter.post('/campaigns', async (req, res, next) => {
  try {
    const slug = asString(req.body?.slug);
    const name = asString(req.body?.name);
    if (!slug || !name) {
      sendProblem(
        res,
        problem(400, 'AL-CMP-1001', 'slug and name are required', [
          ...(slug ? [] : [{ field: 'slug', code: 'required', message: 'slug is required' }]),
          ...(name ? [] : [{ field: 'name', code: 'required', message: 'name is required' }]),
        ]),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<CampaignRow>(
        `INSERT INTO campaigns (slug, name, description, status, target_audience, rule_codes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          slug,
          name,
          asString(req.body.description) ?? null,
          asString(req.body.status) ?? 'draft',
          req.body.target_audience ? JSON.stringify(req.body.target_audience) : null,
          Array.isArray(req.body.rule_codes) ? req.body.rule_codes : null,
        ],
      );
      await emitEvent('al.campaign.created', rows[0].id, rows[0], 'al.campaign.created');
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    const ts = new Date().toISOString();
    const row: CampaignRow = {
      id: crypto.randomUUID(),
      slug,
      name,
      description: asString(req.body.description) ?? null,
      status: asString(req.body.status) ?? 'draft',
      version: 1,
      target_audience: req.body.target_audience ?? null,
      rule_codes: Array.isArray(req.body.rule_codes) ? req.body.rule_codes : null,
      created_at: ts,
      updated_at: ts,
    };
    memory.campaigns.push(row);
    await emitEvent('al.campaign.created', row.id, row, 'al.campaign.created');
    res.status(201).json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});
