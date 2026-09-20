import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type WebhookSubscriptionRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, listEnvelope, singleEnvelope } from './helpers.js';

export const webhooksRouter = Router();

webhooksRouter.get('/webhooks', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<WebhookSubscriptionRow>(
        'SELECT * FROM webhook_subscriptions ORDER BY created_at ASC',
      );
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.webhookSubscriptions));
  } catch (err) {
    next(err);
  }
});

webhooksRouter.post('/webhooks', async (req, res, next) => {
  try {
    const url = asString(req.body?.url);
    const events = Array.isArray(req.body?.events)
      ? req.body.events.filter((e: unknown): e is string => typeof e === 'string')
      : null;
    if (!url || !events || events.length === 0) {
      sendProblem(
        res,
        problem(400, 'AL-GEN-1005', 'url and a non-empty events array are required', [
          ...(url ? [] : [{ field: 'url', code: 'required', message: 'url is required' }]),
          ...(events && events.length > 0
            ? []
            : [{ field: 'events', code: 'required', message: 'events must be a non-empty array of topic names' }]),
        ]),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<WebhookSubscriptionRow>(
        `INSERT INTO webhook_subscriptions (url, events) VALUES ($1, $2) RETURNING *`,
        [url, events],
      );
      await emitEvent('al.webhook.created', rows[0].id, rows[0], 'al.webhook.created');
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    const row: WebhookSubscriptionRow = {
      id: crypto.randomUUID(),
      url,
      events,
      status: 'active',
      signing_secret: `whsec_${crypto.randomBytes(16).toString('hex')}`,
      created_at: new Date().toISOString(),
    };
    memory.webhookSubscriptions.push(row);
    await emitEvent('al.webhook.created', row.id, row, 'al.webhook.created');
    res.status(201).json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});
