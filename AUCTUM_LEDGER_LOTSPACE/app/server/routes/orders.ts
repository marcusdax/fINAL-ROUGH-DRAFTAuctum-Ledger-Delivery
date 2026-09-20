import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db/index.js';
import { memory, type CatalogLotRow, type OrderRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asInt, asString, listEnvelope, singleEnvelope } from './helpers.js';

export const ordersRouter = Router();

interface LineItem {
  lot_id: string;
  quantity_lbs: number;
  price_per_lb_cents?: number;
}

function parseLineItems(value: unknown): LineItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: LineItem[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') return null;
    const lotId = asString((raw as Record<string, unknown>).lot_id);
    const qty = asInt((raw as Record<string, unknown>).quantity_lbs);
    if (!lotId || !qty || qty <= 0) return null;
    items.push({ lot_id: lotId, quantity_lbs: qty });
  }
  return items;
}

ordersRouter.get('/orders', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await db.pg.query('SELECT * FROM orders ORDER BY created_at DESC');
      res.json(listEnvelope(rows.rows));
      return;
    }
    res.json(listEnvelope(memory.orders));
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/orders/:id', async (req, res, next) => {
  try {
    if (db.pg) {
      const rows = await db.pg.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
      if (rows.rows.length === 0) {
        sendProblem(res, problem(404, 'AL-ORD-1001', `Order ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows.rows[0]));
      return;
    }
    const row = memory.orders.find((o) => o.id === req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-ORD-1001', `Order ${req.params.id} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

/** Create an order with atomic inventory reservation across its line items. */
ordersRouter.post('/orders', async (req, res, next) => {
  try {
    const accountId = asString(req.body?.account_id);
    const items = parseLineItems(req.body?.line_items);
    if (!accountId || !items) {
      sendProblem(
        res,
        problem(400, 'AL-ORD-1001', 'account_id and a non-empty line_items array are required', [
          ...(accountId
            ? []
            : [{ field: 'account_id', code: 'required', message: 'account_id is required' }]),
          ...(items
            ? []
            : [
                {
                  field: 'line_items',
                  code: 'invalid',
                  message: 'line_items must be a non-empty array of {lot_id, quantity_lbs>0}',
                },
              ]),
        ]),
      );
      return;
    }

    if (db.pg) {
      const client = await db.pg.connect();
      try {
        await client.query('BEGIN');
        let total = 0;
        const pricedItems: Required<LineItem>[] = [];
        for (const item of items) {
          const lotRes = await client.query(
            `UPDATE catalog_lots
             SET available_quantity_lbs = available_quantity_lbs - $2, last_updated_at = now()
             WHERE id = $1 AND status = 'active' AND available_quantity_lbs >= $2
             RETURNING price_per_lb_cents`,
            [item.lot_id, item.quantity_lbs],
          );
          if (lotRes.rows.length === 0) {
            const existing = await client.query(
              'SELECT status, available_quantity_lbs FROM catalog_lots WHERE id = $1',
              [item.lot_id],
            );
            await client.query('ROLLBACK');
            if (existing.rows.length === 0 || existing.rows[0].status !== 'active') {
              sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${item.lot_id} retired or not found`));
              return;
            }
            sendProblem(
              res,
              problem(
                409,
                'AL-CAT-1001',
                `Insufficient inventory on lot ${item.lot_id}: requested ${item.quantity_lbs} lbs, ${existing.rows[0].available_quantity_lbs} lbs available`,
              ),
            );
            return;
          }
          const price = Number(lotRes.rows[0].price_per_lb_cents);
          total += price * item.quantity_lbs;
          pricedItems.push({ ...item, price_per_lb_cents: price });
        }
        const orderRes = await client.query(
          `INSERT INTO orders (account_id, line_items, final_total_cents, invoice_number)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            accountId,
            JSON.stringify(pricedItems),
            total,
            asString(req.body.invoice_number) ?? null,
          ],
        );
        await client.query('COMMIT');
        const order = orderRes.rows[0];
        await emitEvent('al.orders.order_created', order.id as string, order, 'al.orders.order_created');
        res.status(201).json(singleEnvelope(order));
        return;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory mode: validate all lines before mutating (atomic semantics).
    const lots: CatalogLotRow[] = [];
    let total = 0;
    const pricedItems: Required<LineItem>[] = [];
    for (const item of items) {
      const lot = memory.catalogLots.find((l) => l.id === item.lot_id);
      if (!lot || lot.status !== 'active') {
        sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${item.lot_id} retired or not found`));
        return;
      }
      if (lot.available_quantity_lbs < item.quantity_lbs) {
        sendProblem(
          res,
          problem(
            409,
            'AL-CAT-1001',
            `Insufficient inventory on lot ${item.lot_id}: requested ${item.quantity_lbs} lbs, ${lot.available_quantity_lbs} lbs available`,
          ),
        );
        return;
      }
      lots.push(lot);
      total += lot.price_per_lb_cents * item.quantity_lbs;
      pricedItems.push({ ...item, price_per_lb_cents: lot.price_per_lb_cents });
    }
    const ts = new Date().toISOString();
    items.forEach((item, i) => {
      lots[i].available_quantity_lbs -= item.quantity_lbs;
      lots[i].last_updated_at = ts;
      lots[i].updated_at = ts;
    });
    const order: OrderRow = {
      id: crypto.randomUUID(),
      account_id: accountId,
      status: 'pending',
      line_items: pricedItems,
      final_total_cents: total,
      invoice_number: asString(req.body.invoice_number) ?? null,
      created_at: ts,
      updated_at: ts,
    };
    memory.orders.push(order);
    await emitEvent('al.orders.order_created', order.id, order, 'al.orders.order_created');
    res.status(201).json(singleEnvelope(order));
  } catch (err) {
    next(err);
  }
});
