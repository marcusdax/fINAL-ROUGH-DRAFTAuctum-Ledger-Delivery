import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getStateId(name: string): Promise<number> {
  const res = await pool.query('SELECT id FROM credential_states WHERE name = $1', [name]);
  return res.rows[0]?.id;
}

async function createCredential(userId: string, credentialType: string, stateId?: number): Promise<string> {
  const res = await pool.query(
    `INSERT INTO credential (user_id, credential_type, state_id)
     VALUES ($1, $2, COALESCE($3, 1))
     RETURNING id`,
    [userId, credentialType, stateId]
  );
  return res.rows[0].id;
}

async function getCredentialState(credentialId: string): Promise<string> {
  const res = await pool.query(
    `SELECT cs.name FROM credential c
     JOIN credential_states cs ON c.state_id = cs.id
     WHERE c.id = $1`,
    [credentialId]
  );
  return res.rows[0]?.name;
}

async function transitionCredential(credentialId: string, eventType: string, actorUserId: string, reason: string): Promise<void> {
  const stateMap: Record<string, string> = {
    renew: 'expiring',
    drift_flagged: 'stale',
    lapse: 'lapsed',
  };
  
  const targetState = stateMap[eventType];
  if (!targetState) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  const stateId = await getStateId(targetState);
  
  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE credential SET state_id = $1, updated_at = now() WHERE id = $2`,
      [stateId, credentialId]
    );
    await pool.query(
      `INSERT INTO credential_events (credential_id, event_type, actor_user_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [credentialId, eventType, actorUserId, reason]
    );
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
}

describe('credential state machine', () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testActorId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping tests: DATABASE_URL not set');
      return;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    // Clean up test data
    await pool.query(`DELETE FROM credential_events WHERE credential_id IN (SELECT id FROM credential WHERE user_id = $1)`, [testUserId]);
    await pool.query(`DELETE FROM credential WHERE user_id = $1`, [testUserId]);
  });

  it('new credential defaults to active state', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'barista_level_1');
    const state = await getCredentialState(credentialId);
    
    expect(state).toBe('active');
  });

  it('renew operation moves state to expiring', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'barista_level_1');
    await transitionCredential(credentialId, 'renew', testActorId, 'Renewal initiated');
    
    const state = await getCredentialState(credentialId);
    expect(state).toBe('expiring');
  });

  it('drift_flagged transition moves state to stale', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'roaster_certification');
    await transitionCredential(credentialId, 'drift_flagged', testActorId, 'SOP version mismatch detected');
    
    const state = await getCredentialState(credentialId);
    expect(state).toBe('stale');
  });

  it('lapse transition moves state to lapsed', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'quality_analyst');
    await transitionCredential(credentialId, 'lapse', testActorId, 'Credential expired');
    
    const state = await getCredentialState(credentialId);
    expect(state).toBe('lapsed');
  });

  it('credential_events table records all transitions', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'barista_level_1');
    
    await transitionCredential(credentialId, 'renew', testActorId, 'Renewal initiated');
    await transitionCredential(credentialId, 'drift_flagged', testActorId, 'SOP version mismatch');
    await transitionCredential(credentialId, 'lapse', testActorId, 'Credential expired');
    
    const res = await pool.query(
      `SELECT event_type FROM credential_events WHERE credential_id = $1 ORDER BY occurred_at`,
      [credentialId]
    );
    
    const eventTypes = res.rows.map(r => r.event_type);
    expect(eventTypes).toEqual(['renew', 'drift_flagged', 'lapse']);
  });

  it('foreign key constraint prevents invalid state_id', async () => {
    if (!process.env.DATABASE_URL) return;
    
    await expect(
      pool.query(
        `INSERT INTO credential (user_id, credential_type, state_id) VALUES ($1, $2, $3)`,
        [testUserId, 'test_type', 999]
      )
    ).rejects.toThrow();
  });

  it('credential_events cascades on credential delete', async () => {
    if (!process.env.DATABASE_URL) return;
    
    const credentialId = await createCredential(testUserId, 'test_type');
    await transitionCredential(credentialId, 'renew', testActorId, 'Test');
    
    await pool.query(`DELETE FROM credential WHERE id = $1`, [credentialId]);
    
    const res = await pool.query(
      `SELECT COUNT(*) FROM credential_events WHERE credential_id = $1`,
      [credentialId]
    );
    
    expect(parseInt(res.rows[0].count)).toBe(0);
  });
});
