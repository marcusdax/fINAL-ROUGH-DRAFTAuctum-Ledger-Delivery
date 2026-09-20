import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

/**
 * Migration runner: executes `server/db/migrations/*.sql` in filename order.
 * Only the `-- up` section of each file runs (content before the `-- down`
 * separator line). Applied filenames are tracked in `migrations_applied`,
 * making the runner idempotent.
 */

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Extract the `-- up` section: everything before the first `-- down` line. */
export function extractUpSection(sql: string): string {
  const lines = sql.split(/\r?\n/);
  const downIndex = lines.findIndex((line) => line.trim() === '-- down');
  const upLines = downIndex === -1 ? lines : lines.slice(0, downIndex);
  return upLines.join('\n').trim();
}

export async function runMigrations(): Promise<string[]> {
  if (!db.pg) {
    throw new Error('DATABASE_URL is not set; cannot run migrations');
  }
  const client = await db.pg.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const appliedRows = await client.query<{ filename: string }>(
      'SELECT filename FROM migrations_applied',
    );
    const applied = new Set(appliedRows.rows.map((r) => r.filename));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const ran: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const up = extractUpSection(sql);
      if (!up) {
        console.warn(`[migrate] ${file}: empty -- up section, skipped`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(up);
        await client.query('INSERT INTO migrations_applied (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        ran.push(file);
        console.log(`[migrate] applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    return ran;
  } finally {
    client.release();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  runMigrations()
    .then(async (ran) => {
      console.log(ran.length === 0 ? '[migrate] already up to date' : `[migrate] done (${ran.length} applied)`);
      await db.pg?.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[migrate] failed:', err);
      await db.pg?.end().catch(() => undefined);
      process.exit(1);
    });
}
