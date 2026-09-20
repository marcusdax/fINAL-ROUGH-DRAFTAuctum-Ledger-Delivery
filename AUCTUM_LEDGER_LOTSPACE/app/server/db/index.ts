import { Pool } from 'pg';
import { createClient, type RedisClientType } from 'redis';
import { Kafka } from 'kafkajs';

/**
 * Service registry (brief §5). Dual-mode: when DATABASE_URL is unset, `db.pg`
 * is null and routes fall back to in-memory arrays (dev/test convenience).
 * Redis and Kafka clients are constructed but connect lazily — importing this
 * module never opens a network connection.
 */

export interface OutboxRecord {
  id: string;
  topic: string;
  key?: string;
  payload: unknown;
  published: boolean;
  error?: string;
  attempts: number;
  createdAt: Date;
  publishedAt?: Date;
}

export interface DbRegistry {
  pg: Pool | null;
  redis: RedisClientType | null;
  kafka: Kafka | null;
  outboxQueue: OutboxRecord[];
}

const databaseUrl = process.env.DATABASE_URL;
const kafkaBrokers = process.env.KAFKA_BROKERS;

export const db: DbRegistry = {
  pg: databaseUrl ? new Pool({ connectionString: databaseUrl }) : null,
  redis: null,
  kafka: kafkaBrokers
    ? new Kafka({ clientId: 'auctum-ledger-api', brokers: kafkaBrokers.split(',') })
    : null,
  outboxQueue: [],
};

let redisConnecting: Promise<RedisClientType | null> | null = null;

/** Lazily create + connect the shared Redis client; null when unreachable/unconfigured. */
export async function getRedis(): Promise<RedisClientType | null> {
  if (db.redis) return db.redis;
  if (redisConnecting) return redisConnecting;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redisConnecting = (async () => {
    try {
      const client = createClient({ url });
      client.on('error', () => {
        // Swallow background errors; callers fall back to in-memory stores.
      });
      await client.connect();
      db.redis = client as RedisClientType;
      return db.redis;
    } catch {
      return null;
    } finally {
      redisConnecting = null;
    }
  })();
  return redisConnecting;
}

/** Run a query against pg; throws when DATABASE_URL is not configured. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  if (!db.pg) {
    throw new Error('DATABASE_URL is not set; PostgreSQL is unavailable');
  }
  const res = await db.pg.query(text, params as unknown[]);
  return res.rows as T[];
}

/** Graceful shutdown for tests and process exit. */
export async function shutdownDb(): Promise<void> {
  if (db.redis) {
    try {
      await db.redis.quit();
    } catch {
      /* already closed */
    }
    db.redis = null;
  }
  if (db.pg) {
    await db.pg.end();
  }
}
