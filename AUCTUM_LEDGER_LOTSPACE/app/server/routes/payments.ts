import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type PaymentIntentRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asInt, asString, singleEnvelope } from './helpers.js';

export const paymentsRouter = Router();

export interface PaymentIntent {
  id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  client_secret: string;
  created_at: string;
}

function createClientSecret(): string {
  return `pi_${crypto.randomBytes(24).toString('hex')}`;
}

async function findOrder(orderId: string): Promise<{ id: string; final_total_cents: number; status: string } | undefined> {
  if (db.pg) {
    const rows = await query<{ id: string; final_total_cents: number; status: string }>(
      'SELECT id, final_total_cents, status FROM orders WHERE id = $1',
      [orderId],
    );
    return rows[0];
  }
  const row = memory.orders.find((o) => o.id === orderId);
  return row ? { id: row.id, final_total_cents: row.final_total_cents, status: row.status } : undefined;
}

/** Create a payment intent for an existing order. */
paymentsRouter.post('/payments/intents', async (req, res, next) => {
  try {
    const orderId = asString(req.body?.order_id);
    const currency = asString(req.body?.currency) ?? 'USD';
    if (!orderId) {
      sendProblem(
        res,
        problem(400, 'AL-PAY-1001', 'order_id is required', [
          { field: 'order_id', code: 'required', message: 'order_id is required' },
        ]),
      );
      return;
    }

    const order = await findOrder(orderId);
    if (!order) {
      sendProblem(res, problem(404, 'AL-ORD-1001', `Order ${orderId} not found`));
      return;
    }

    const amountCents = asInt(req.body?.amount_cents) ?? order.final_total_cents;
    const ts = new Date().toISOString();

    if (db.pg) {
      const rows = await query<PaymentIntentRow>(
        `INSERT INTO payment_intents (order_id, amount_cents, currency, status, client_secret)
         VALUES ($1, $2, $3, 'requires_payment_method', $4) RETURNING *`,
        [orderId, amountCents, currency, createClientSecret()],
      );
      const intent = rows[0];
      await emitEvent('al.payment_intent.created', intent.id, intent, 'al.payment_intent.created');
      res.status(201).json(singleEnvelope(intent));
      return;
    }

    const intent: PaymentIntentRow = {
      id: crypto.randomUUID(),
      order_id: orderId,
      amount_cents: amountCents,
      currency,
      status: 'requires_payment_method',
      client_secret: createClientSecret(),
      created_at: ts,
    };
    memory.paymentIntents.push(intent);
    await emitEvent('al.payment_intent.created', intent.id, intent, 'al.payment_intent.created');
    res.status(201).json(singleEnvelope(intent));
  } catch (err) {
    next(err);
  }
});

/** Complete a payment intent — transitions order to paid. */
paymentsRouter.post('/payments/intents/:id/complete', async (req, res, next) => {
  try {
    const intentId = req.params.id;

    if (db.pg) {
      const client = await db.pg.connect();
      try {
        await client.query('BEGIN');
        const intentRows = await client.query<PaymentIntentRow>(
          `SELECT * FROM payment_intents WHERE id = $1 FOR UPDATE`,
          [intentId],
        );
        if (intentRows.rows.length === 0) {
          await client.query('ROLLBACK');
          sendProblem(res, problem(404, 'AL-PAY-1001', `Payment intent ${intentId} not found`));
          return;
        }
        const intent = intentRows.rows[0];
        if (intent.status === 'succeeded') {
          await client.query('ROLLBACK');
          res.json(singleEnvelope(intent));
          return;
        }
        if (intent.status === 'canceled') {
          await client.query('ROLLBACK');
          sendProblem(res, problem(409, 'AL-PAY-1002', 'Payment intent already canceled'));
          return;
        }

        const updated = await client.query<PaymentIntentRow>(
          `UPDATE payment_intents SET status = 'succeeded' WHERE id = $1 RETURNING *`,
          [intentId],
        );
        const orderUpdated = await client.query(
          `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1 RETURNING *`,
          [intent.order_id],
        );
        await client.query('COMMIT');
        const payload = { intent: updated.rows[0], order: orderUpdated.rows[0] };
        await emitEvent('al.payment_intent.succeeded', intentId, payload, 'al.payment_intent.succeeded');
        res.json(singleEnvelope(payload));
        return;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }

    const intent = memory.paymentIntents.find((p) => p.id === intentId);
    if (!intent) {
      sendProblem(res, problem(404, 'AL-PAY-1001', `Payment intent ${intentId} not found`));
      return;
    }
    if (intent.status === 'succeeded') {
      res.json(singleEnvelope(intent));
      return;
    }
    if (intent.status === 'canceled') {
      sendProblem(res, problem(409, 'AL-PAY-1002', 'Payment intent already canceled'));
      return;
    }
    intent.status = 'succeeded';
    const order = memory.orders.find((o) => o.id === intent.order_id);
    if (order) {
      order.status = 'paid';
      order.updated_at = new Date().toISOString();
    }
    await emitEvent('al.payment_intent.succeeded', intentId, { intent, order }, 'al.payment_intent.succeeded');
    res.json(singleEnvelope({ intent, order }));
  } catch (err) {
    next(err);
  }
});

/** Cancel a payment intent. */
paymentsRouter.post('/payments/intents/:id/cancel', async (req, res, next) => {
  try {
    const intentId = req.params.id;

    if (db.pg) {
      const rows = await query<PaymentIntentRow>(
        `UPDATE payment_intents SET status = 'canceled' WHERE id = $1 RETURNING *`,
        [intentId],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-PAY-1001', `Payment intent ${intentId} not found`));
        return;
      }
      await emitEvent('al.payment_intent.canceled', intentId, rows[0], 'al.payment_intent.canceled');
      res.json(singleEnvelope(rows[0]));
      return;
    }

    const intent = memory.paymentIntents.find((p) => p.id === intentId);
    if (!intent) {
      sendProblem(res, problem(404, 'AL-PAY-1001', `Payment intent ${intentId} not found`));
      return;
    }
    intent.status = 'canceled';
    await emitEvent('al.payment_intent.canceled', intentId, intent, 'al.payment_intent.canceled');
    res.json(singleEnvelope(intent));
  } catch (err) {
    next(err);
  }
});

/** Get payment status for an order. */
paymentsRouter.get('/payments/orders/:orderId', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    if (db.pg) {
      const rows = await query<PaymentIntentRow>(
        'SELECT * FROM payment_intents WHERE order_id = $1 ORDER BY created_at DESC',
        [orderId],
      );
      res.json(singleEnvelope(rows[0] ?? null));
      return;
    }
    const intent = memory.paymentIntents
      .filter((p) => p.order_id === orderId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
    res.json(singleEnvelope(intent));
  } catch (err) {
    next(err);
  }
});