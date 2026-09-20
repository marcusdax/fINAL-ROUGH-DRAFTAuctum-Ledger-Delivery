import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type CatalogLotRow } from '../db/memory.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asInt, listEnvelope, singleEnvelope } from './helpers.js';

export const catalogRouter = Router();

catalogRouter.get('/catalog/lots', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (db.pg) {
      const rows = status
        ? await query<CatalogLotRow>(
            'SELECT * FROM catalog_lots WHERE status = $1 ORDER BY cup_score DESC NULLS LAST',
            [status],
          )
        : await query<CatalogLotRow>('SELECT * FROM catalog_lots ORDER BY cup_score DESC NULLS LAST');
      res.json(listEnvelope(rows));
      return;
    }
    const rows = status
      ? memory.catalogLots.filter((l) => l.status === status)
      : memory.catalogLots;
    res.json(listEnvelope(rows));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/catalog/lots/:id', async (req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<CatalogLotRow>(
        "SELECT * FROM catalog_lots WHERE id = $1 AND status != 'retired'",
        [req.params.id],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${req.params.id} retired or not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.catalogLots.find((l) => l.id === req.params.id && l.status !== 'retired');
    if (!row) {
      sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${req.params.id} retired or not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

/** Reserve inventory against a lot (row-level decrement; no double-decrement). */
catalogRouter.post('/catalog/lots/:id/reservations', async (req, res, next) => {
  try {
    const quantityLbs = asInt(req.body?.quantity_lbs);
    if (!quantityLbs || quantityLbs <= 0) {
      sendProblem(
        res,
        problem(400, 'AL-CAT-1001', 'quantity_lbs must be a positive integer', [
          { field: 'quantity_lbs', code: 'invalid', message: 'quantity_lbs must be a positive integer' },
        ]),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<CatalogLotRow>(
        `UPDATE catalog_lots
         SET available_quantity_lbs = available_quantity_lbs - $2,
             last_updated_at = now()
         WHERE id = $1 AND status = 'active' AND available_quantity_lbs >= $2
         RETURNING *`,
        [req.params.id, quantityLbs],
      );
      if (rows.length === 0) {
        const existing = await query<CatalogLotRow>(
          'SELECT id, status, available_quantity_lbs FROM catalog_lots WHERE id = $1',
          [req.params.id],
        );
        if (existing.length === 0 || existing[0].status !== 'active') {
          sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${req.params.id} retired or not found`));
          return;
        }
        sendProblem(
          res,
          problem(
            409,
            'AL-CAT-1001',
            `Insufficient inventory: requested ${quantityLbs} lbs, ${existing[0].available_quantity_lbs} lbs available`,
          ),
        );
        return;
      }
      const reservation = {
        id: crypto.randomUUID(),
        lot_id: rows[0].id,
        quantity_lbs: quantityLbs,
        remaining_lbs: rows[0].available_quantity_lbs,
        reserved_at: new Date().toISOString(),
      };
      res.status(201).json(singleEnvelope(reservation));
      return;
    }
    const lot = memory.catalogLots.find((l) => l.id === req.params.id);
    if (!lot || lot.status !== 'active') {
      sendProblem(res, problem(404, 'AL-CAT-1002', `Lot ${req.params.id} retired or not found`));
      return;
    }
    if (lot.available_quantity_lbs < quantityLbs) {
      sendProblem(
        res,
        problem(
          409,
          'AL-CAT-1001',
          `Insufficient inventory: requested ${quantityLbs} lbs, ${lot.available_quantity_lbs} lbs available`,
        ),
      );
      return;
    }
    lot.available_quantity_lbs -= quantityLbs;
    lot.last_updated_at = new Date().toISOString();
    lot.updated_at = lot.last_updated_at;
    const reservation = {
      id: crypto.randomUUID(),
      lot_id: lot.id,
      quantity_lbs: quantityLbs,
      remaining_lbs: lot.available_quantity_lbs,
      reserved_at: lot.last_updated_at,
    };
    res.status(201).json(singleEnvelope(reservation));
  } catch (err) {
    next(err);
  }
});
