import crypto from 'node:crypto';
import type { Producer } from 'kafkajs';
import { db, type OutboxRecord } from '../db/index.js';

/**
 * Domain event emission (brief §5 / task 6).
 *
 * `emitEvent` wraps payloads in a CloudEvents 1.0 envelope and publishes to
 * Kafka. When Kafka is unavailable (dev/test) the event is appended to the
 * transactional outbox (`db.outboxQueue` in-memory + `outbox_events` table
 * when pg is present) and flushed later by `startOutboxRelay`.
 */

export const CLOUDEVENTS_SPECVERSION = '1.0';
export const DEFAULT_EVENT_SOURCE = 'https://api.auctumledger.io/services/api';

export interface CloudEvent<T = unknown> {
  specversion: typeof CLOUDEVENTS_SPECVERSION;
  id: string;
  source: string;
  type: string;
  subject?: string;
  time: string;
  datacontenttype: 'application/json';
  data: T;
}

export interface EmitEventInput {
  topic: string;
  key?: string;
  data: unknown;
  type: string;
  source?: string;
}

export function buildCloudEvent(input: EmitEventInput): CloudEvent {
  const event: CloudEvent = {
    specversion: CLOUDEVENTS_SPECVERSION,
    id: crypto.randomUUID(),
    source: input.source ?? DEFAULT_EVENT_SOURCE,
    type: input.type,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: input.data,
  };
  if (input.key !== undefined) event.subject = input.key;
  return event;
}

let producer: Producer | null = null;
let producerConnecting: Promise<Producer | null> | null = null;

async function getProducer(): Promise<Producer | null> {
  if (producer) return producer;
  if (!db.kafka) return null;
  if (producerConnecting) return producerConnecting;
  producerConnecting = (async () => {
    try {
      const p = db.kafka!.producer();
      await p.connect();
      producer = p;
      return p;
    } catch {
      return null;
    } finally {
      producerConnecting = null;
    }
  })();
  return producerConnecting;
}

async function pushToOutbox(input: EmitEventInput, event: CloudEvent, error?: string): Promise<void> {
  const record: OutboxRecord = {
    id: event.id,
    topic: input.topic,
    key: input.key,
    payload: event,
    published: false,
    error,
    attempts: 0,
    createdAt: new Date(),
  };
  db.outboxQueue.push(record);
  if (db.pg) {
    try {
      await db.pg.query(
        `INSERT INTO outbox_events (id, topic, key, payload, published, error)
         VALUES ($1, $2, $3, $4, FALSE, $5)
         ON CONFLICT (id) DO NOTHING`,
        [record.id, record.topic, record.key ?? null, JSON.stringify(event), error ?? null],
      );
    } catch {
      /* outbox table may not exist yet; in-memory queue still holds the event */
    }
  }
}

export async function emitEvent(topic: string, key: string | undefined, data: unknown, type: string): Promise<void>;
export async function emitEvent(input: EmitEventInput): Promise<void>;
export async function emitEvent(
  topicOrInput: string | EmitEventInput,
  key?: string,
  data?: unknown,
  type?: string,
): Promise<void> {
  const input: EmitEventInput =
    typeof topicOrInput === 'string'
      ? { topic: topicOrInput, key, data, type: type as string }
      : topicOrInput;
  const event = buildCloudEvent(input);
  const p = await getProducer();
  if (p) {
    try {
      await p.send({
        topic: input.topic,
        messages: [{ key: input.key, value: JSON.stringify(event) }],
      });
      return;
    } catch (err) {
      producer = null;
      await pushToOutbox(input, event, err instanceof Error ? err.message : String(err));
      return;
    }
  }
  await pushToOutbox(input, event, 'kafka unavailable');
}

async function flushOutbox(): Promise<void> {
  const pending = db.outboxQueue.filter((r) => !r.published);
  if (pending.length === 0) return;
  const p = await getProducer();
  for (const record of pending) {
    record.attempts += 1;
    if (p) {
      try {
        await p.send({
          topic: record.topic,
          messages: [{ key: record.key, value: JSON.stringify(record.payload) }],
        });
        record.published = true;
        record.publishedAt = new Date();
        record.error = undefined;
      } catch (err) {
        record.error = err instanceof Error ? err.message : String(err);
      }
    } else {
      // Dev mode without Kafka: log and mark published so the queue drains.
      console.log('[outbox] dev-publish', record.topic, JSON.stringify(record.payload));
      record.published = true;
      record.publishedAt = new Date();
      record.error = undefined;
    }
    if (db.pg && record.published) {
      try {
        await db.pg.query(
          `UPDATE outbox_events SET published = TRUE, published_at = now(), attempts = $2, error = NULL
           WHERE id = $1`,
          [record.id, record.attempts],
        );
      } catch {
        /* non-fatal */
      }
    }
  }
  // Drop published records from the in-memory queue.
  for (let i = db.outboxQueue.length - 1; i >= 0; i -= 1) {
    if (db.outboxQueue[i].published) db.outboxQueue.splice(i, 1);
  }
}

/** Periodic task flushing the outbox to Kafka. Returns a stop function. */
export function startOutboxRelay(intervalMs = 5000): () => void {
  const timer = setInterval(() => {
    void flushOutbox().catch((err) => console.error('[outbox] relay error', err));
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Test/dev helper: flush pending outbox records once. */
export async function flushOutboxOnce(): Promise<void> {
  await flushOutbox();
}

export async function shutdownKafka(): Promise<void> {
  if (producer) {
    try {
      await producer.disconnect();
    } catch {
      /* already disconnected */
    }
    producer = null;
  }
}
