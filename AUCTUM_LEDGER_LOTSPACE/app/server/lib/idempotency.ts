import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getRedis } from '../db/index.js';
import { problem, sendProblem } from './problem.js';

/**
 * Idempotency middleware (brief §5).
 *
 * All mutating endpoints (POST/PATCH) require an `Idempotency-Key` header:
 *   - missing key                    → 400 AL-GEN-1004
 *   - same key, different body hash  → 422 AL-GEN-1003
 *   - same key, same body (replay)   → stored response replayed
 *
 * Storage: Redis `SET key body NX EX 86400`; falls back to an in-memory Map
 * when Redis is unreachable (test/dev only).
 */

export const IDEMPOTENCY_TTL_SECONDS = 86400;
const KEY_PREFIX = 'auctum-ledger:idem:';

export interface StoredResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyEntry {
  bodyHash: string;
  response?: StoredResponse;
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyEntry | undefined>;
  /** Insert only if absent (NX semantics). Returns true when inserted. */
  setIfAbsent(key: string, entry: IdempotencyEntry): Promise<boolean>;
  update(key: string, entry: IdempotencyEntry): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, IdempotencyEntry>();

  async get(key: string): Promise<IdempotencyEntry | undefined> {
    return this.entries.get(key);
  }

  async setIfAbsent(key: string, entry: IdempotencyEntry): Promise<boolean> {
    if (this.entries.has(key)) return false;
    this.entries.set(key, entry);
    return true;
  }

  async update(key: string, entry: IdempotencyEntry): Promise<void> {
    this.entries.set(key, entry);
  }
}

/** Redis-backed store with NX + EX 86400; degrades to in-memory on failure. */
export class RedisIdempotencyStore implements IdempotencyStore {
  private readonly fallback = new MemoryIdempotencyStore();

  async get(key: string): Promise<IdempotencyEntry | undefined> {
    const redis = await getRedis();
    if (!redis) return this.fallback.get(key);
    try {
      const raw = await redis.get(KEY_PREFIX + key);
      if (raw === null) return this.fallback.get(key);
      return JSON.parse(raw) as IdempotencyEntry;
    } catch {
      return this.fallback.get(key);
    }
  }

  async setIfAbsent(key: string, entry: IdempotencyEntry): Promise<boolean> {
    const redis = await getRedis();
    if (!redis) return this.fallback.setIfAbsent(key, entry);
    try {
      const result = await redis.set(KEY_PREFIX + key, JSON.stringify(entry), {
        NX: true,
        EX: IDEMPOTENCY_TTL_SECONDS,
      });
      const inserted = result === 'OK';
      if (!inserted) return false;
      // Keep fallback in sync so a later Redis outage still replays.
      await this.fallback.setIfAbsent(key, entry);
      return true;
    } catch {
      return this.fallback.setIfAbsent(key, entry);
    }
  }

  async update(key: string, entry: IdempotencyEntry): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.set(KEY_PREFIX + key, JSON.stringify(entry), {
          EX: IDEMPOTENCY_TTL_SECONDS,
        });
      } catch {
        /* fall through to memory */
      }
    }
    await this.fallback.update(key, entry);
  }
}

let defaultStore: IdempotencyStore | null = null;

export function getIdempotencyStore(): IdempotencyStore {
  if (!defaultStore) defaultStore = new RedisIdempotencyStore();
  return defaultStore;
}

export function hashRequestBody(body: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(body ?? null)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`;
}

export type IdempotencyCheck =
  | { kind: 'new' }
  | { kind: 'replay'; entry: IdempotencyEntry }
  | { kind: 'conflict' };

/** Inspect a key against the store without mutating it. */
export async function checkIdempotency(
  key: string,
  bodyHash: string,
  store: IdempotencyStore = getIdempotencyStore(),
): Promise<IdempotencyCheck> {
  const existing = await store.get(key);
  if (!existing) return { kind: 'new' };
  if (existing.bodyHash !== bodyHash) return { kind: 'conflict' };
  if (!existing.response) return { kind: 'new' };
  return { kind: 'replay', entry: existing };
}

/** Persist the response for future replays. */
export async function storeIdempotency(
  key: string,
  bodyHash: string,
  response: StoredResponse,
  store: IdempotencyStore = getIdempotencyStore(),
): Promise<void> {
  await store.update(key, { bodyHash, response });
}

/** Express middleware enforcing the Idempotency-Key contract on POST/PATCH. */
export function idempotency(store: IdempotencyStore = getIdempotencyStore()): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      next();
      return;
    }
    const key = req.header('Idempotency-Key');
    if (!key) {
      sendProblem(
        res,
        problem(400, 'AL-GEN-1004', 'Idempotency-Key header is required on mutating requests'),
      );
      return;
    }
    const bodyHash = hashRequestBody(req.body);
    try {
      const check = await checkIdempotency(key, bodyHash, store);
      if (check.kind === 'conflict') {
        sendProblem(
          res,
          problem(422, 'AL-GEN-1003', 'Idempotency-Key was reused with a different request body'),
        );
        return;
      }
      if (check.kind === 'replay') {
        const stored = check.entry.response as StoredResponse;
        res.status(stored.status).json(stored.body);
        return;
      }
      await store.setIfAbsent(key, { bodyHash });
      // Capture the first successful response for replay.
      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        void storeIdempotency(key, bodyHash, { status: res.statusCode, body }, store).catch(
          () => undefined,
        );
        return originalJson(body);
      }) as Response['json'];
      next();
    } catch (err) {
      next(err);
    }
  };
}
