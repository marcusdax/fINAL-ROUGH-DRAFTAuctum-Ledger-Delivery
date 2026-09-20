import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  MemoryIdempotencyStore,
  checkIdempotency,
  hashRequestBody,
  idempotency,
  storeIdempotency,
} from '../lib/idempotency.js';

function buildApp(store = new MemoryIdempotencyStore()) {
  const app = express();
  app.use(express.json());
  let calls = 0;
  app.post('/things', idempotency(store), (_req, res) => {
    calls += 1;
    res.status(201).json({ data: { n: calls } });
  });
  app.patch('/things', idempotency(store), (_req, res) => {
    res.json({ data: { patched: true } });
  });
  app.get('/things', idempotency(store), (_req, res) => {
    res.json({ data: [] });
  });
  return { app, calls: () => calls };
}

describe('idempotency middleware', () => {
  it('rejects POST without Idempotency-Key → 400 AL-GEN-1004', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/things').send({ a: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AL-GEN-1004');
    expect(res.body.type).toBe('https://api.auctumledger.io/problems/AL-GEN-1004');
  });

  it('rejects PATCH without Idempotency-Key → 400 AL-GEN-1004', async () => {
    const { app } = buildApp();
    const res = await request(app).patch('/things').send({ a: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AL-GEN-1004');
  });

  it('does not require a key on GET', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/things');
    expect(res.status).toBe(200);
  });

  it('first request passes through and stores the response', async () => {
    const { app, calls } = buildApp();
    const res = await request(app).post('/things').set('Idempotency-Key', 'k-1').send({ a: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { n: 1 } });
    expect(calls()).toBe(1);
  });

  it('replay with same key and same body returns the stored response without re-executing', async () => {
    const { app, calls } = buildApp();
    const first = await request(app).post('/things').set('Idempotency-Key', 'k-2').send({ a: 1 });
    const replay = await request(app).post('/things').set('Idempotency-Key', 'k-2').send({ a: 1 });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(calls()).toBe(1);
  });

  it('same key with a different body → 422 AL-GEN-1003', async () => {
    const { app, calls } = buildApp();
    await request(app).post('/things').set('Idempotency-Key', 'k-3').send({ a: 1 });
    const conflict = await request(app).post('/things').set('Idempotency-Key', 'k-3').send({ a: 2 });
    expect(conflict.status).toBe(422);
    expect(conflict.body.code).toBe('AL-GEN-1003');
    expect(calls()).toBe(1);
  });

  it('body hash is key-order independent', () => {
    expect(hashRequestBody({ a: 1, b: { c: 2, d: [3] } })).toBe(
      hashRequestBody({ b: { d: [3], c: 2 }, a: 1 }),
    );
  });

  it('different keys execute independently', async () => {
    const { app, calls } = buildApp();
    await request(app).post('/things').set('Idempotency-Key', 'k-4').send({ a: 1 });
    await request(app).post('/things').set('Idempotency-Key', 'k-5').send({ a: 1 });
    expect(calls()).toBe(2);
  });
});

describe('checkIdempotency / storeIdempotency', () => {
  it('check → new for unknown key, replay after store, conflict on hash mismatch', async () => {
    const store = new MemoryIdempotencyStore();
    const hashA = hashRequestBody({ x: 1 });
    const hashB = hashRequestBody({ x: 2 });

    expect((await checkIdempotency('k', hashA, store)).kind).toBe('new');

    await store.setIfAbsent('k', { bodyHash: hashA });
    // Stored without a response yet → treated as new (in-flight).
    expect((await checkIdempotency('k', hashA, store)).kind).toBe('new');

    await storeIdempotency('k', hashA, { status: 201, body: { ok: true } }, store);
    const replay = await checkIdempotency('k', hashA, store);
    expect(replay.kind).toBe('replay');
    if (replay.kind === 'replay') {
      expect(replay.entry.response).toEqual({ status: 201, body: { ok: true } });
    }

    expect((await checkIdempotency('k', hashB, store)).kind).toBe('conflict');
  });

  it('setIfAbsent enforces NX semantics', async () => {
    const store = new MemoryIdempotencyStore();
    expect(await store.setIfAbsent('k', { bodyHash: 'h1' })).toBe(true);
    expect(await store.setIfAbsent('k', { bodyHash: 'h2' })).toBe(false);
    expect((await store.get('k'))?.bodyHash).toBe('h1');
  });
});
