import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type CredentialEventRow, type CredentialRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import {
  InvalidTransitionError,
  isCredentialEvent,
  transitionCredential,
  type CredentialState,
} from '../lib/credentialStateMachine.js';
import { getPrincipal } from '../lib/authn.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, isUuid, listEnvelope, singleEnvelope } from './helpers.js';

export const credentialsRouter = Router();

export const TOPIC_CREDENTIAL_TRANSITIONED = 'al.education.credential_transitioned';

interface CredentialWithState extends Omit<CredentialRow, 'state'> {
  state: CredentialState;
  state_id?: number;
}

/** Static curriculum tracks; labels are i18n keys under `curriculum.*`. */
export const EDUCATION_TRACKS = [
  {
    id: 'track-green-buying',
    slug: 'green-buying-fundamentals',
    titleKey: 'curriculum.tracks.greenBuying.title',
    descriptionKey: 'curriculum.tracks.greenBuying.description',
    credentialType: 'green_buyer_level_1',
    modules: [
      { id: 'gb-1', titleKey: 'curriculum.tracks.greenBuying.modules.lotEvaluation', durationMinutes: 45 },
      { id: 'gb-2', titleKey: 'curriculum.tracks.greenBuying.modules.cuppingCalibration', durationMinutes: 60 },
      { id: 'gb-3', titleKey: 'curriculum.tracks.greenBuying.modules.contractsAndIncoterms', durationMinutes: 50 },
    ],
  },
  {
    id: 'track-sample-evaluation',
    slug: 'sample-evaluation-protocol',
    titleKey: 'curriculum.tracks.sampleEvaluation.title',
    descriptionKey: 'curriculum.tracks.sampleEvaluation.description',
    credentialType: 'sample_evaluation',
    modules: [
      { id: 'se-1', titleKey: 'curriculum.tracks.sampleEvaluation.modules.samplePrep', durationMinutes: 30 },
      { id: 'se-2', titleKey: 'curriculum.tracks.sampleEvaluation.modules.scaForm', durationMinutes: 55 },
    ],
  },
  {
    id: 'track-roaster-certification',
    slug: 'roaster-certification',
    titleKey: 'curriculum.tracks.roasterCertification.title',
    descriptionKey: 'curriculum.tracks.roasterCertification.description',
    credentialType: 'roaster_certification',
    modules: [
      { id: 'rc-1', titleKey: 'curriculum.tracks.roasterCertification.modules.roastCurves', durationMinutes: 70 },
      { id: 'rc-2', titleKey: 'curriculum.tracks.roasterCertification.modules.dyeAndConsistency', durationMinutes: 40 },
      { id: 'rc-3', titleKey: 'curriculum.tracks.roasterCertification.modules.qualityControl', durationMinutes: 65 },
      { id: 'rc-4', titleKey: 'curriculum.tracks.roasterCertification.modules.finalCupping', durationMinutes: 90 },
    ],
  },
] as const;

function memoryToApi(row: CredentialRow): CredentialWithState {
  return { ...row };
}

async function fetchCredential(id: string): Promise<CredentialWithState | undefined> {
  if (db.pg) {
    const rows = await query<CredentialWithState>(
      `SELECT c.*, cs.name AS state
       FROM credential c JOIN credential_states cs ON c.state_id = cs.id
       WHERE c.id = $1`,
      [id],
    );
    return rows[0];
  }
  const row = memory.credentials.find((c) => c.id === id);
  return row ? memoryToApi(row) : undefined;
}

credentialsRouter.get('/credentials', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<CredentialWithState>(
        `SELECT c.*, cs.name AS state
         FROM credential c JOIN credential_states cs ON c.state_id = cs.id
         ORDER BY c.created_at ASC`,
      );
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.credentials.map(memoryToApi)));
  } catch (err) {
    next(err);
  }
});

credentialsRouter.get('/credentials/:id', async (req, res, next) => {
  try {
    const row = await fetchCredential(req.params.id);
    if (!row) {
      sendProblem(res, problem(404, 'AL-EDU-1001', `Credential ${req.params.id} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

credentialsRouter.get('/credentials/:id/events', async (req, res, next) => {
  try {
    const credential = await fetchCredential(req.params.id);
    if (!credential) {
      sendProblem(res, problem(404, 'AL-EDU-1001', `Credential ${req.params.id} not found`));
      return;
    }
    if (db.pg) {
      const events = await query<CredentialEventRow>(
        'SELECT * FROM credential_events WHERE credential_id = $1 ORDER BY occurred_at ASC',
        [req.params.id],
      );
      res.json(listEnvelope(events));
      return;
    }
    const events = memory.credentialEvents.filter((e) => e.credential_id === req.params.id);
    res.json(listEnvelope(events));
  } catch (err) {
    next(err);
  }
});

credentialsRouter.post('/credentials/:id/transitions', async (req, res, next) => {
  try {
    const event = req.body?.event;
    if (!isCredentialEvent(event)) {
      sendProblem(
        res,
        problem(409, 'AL-EDU-1002', `Invalid transition event: ${JSON.stringify(event)}`),
      );
      return;
    }
    const reason = asString(req.body?.reason) ?? null;
    const credential = await fetchCredential(req.params.id);
    if (!credential) {
      sendProblem(res, problem(404, 'AL-EDU-1001', `Credential ${req.params.id} not found`));
      return;
    }

    let result;
    try {
      result = transitionCredential(credential.state, event);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        sendProblem(
          res,
          problem(409, 'AL-EDU-1002', err.message, [
            { field: 'event', code: 'invalid_transition', message: err.message },
          ]),
        );
        return;
      }
      throw err;
    }

    // actor_user_id is a UUID column in pg; only persist UUID-shaped subs.
    const principalSub = getPrincipal(req)?.sub ?? null;
    const actor = principalSub && isUuid(principalSub) ? principalSub : null;
    const occurredAt = new Date().toISOString();

    if (db.pg) {
      const client = await db.pg.connect();
      try {
        await client.query('BEGIN');
        const updated = await client.query(
          `UPDATE credential
           SET state_id = (SELECT id FROM credential_states WHERE name = $2),
               expires_at = COALESCE($3::timestamptz, expires_at)
           WHERE id = $1
           RETURNING *`,
          [credential.id, result.state, result.expiresAt ? result.expiresAt.toISOString() : null],
        );
        const eventRow = await client.query(
          `INSERT INTO credential_events (credential_id, event_type, actor_user_id, reason)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [credential.id, event, actor, reason],
        );
        await client.query('COMMIT');
        const payload = {
          credential: { ...updated.rows[0], state: result.state },
          event: eventRow.rows[0],
        };
        await emitEvent(TOPIC_CREDENTIAL_TRANSITIONED, credential.id, payload, TOPIC_CREDENTIAL_TRANSITIONED);
        res.json(singleEnvelope(payload));
        return;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }

    const row = memory.credentials.find((c) => c.id === credential.id)!;
    row.state = result.state;
    if (result.expiresAt) row.expires_at = result.expiresAt.toISOString();
    row.updated_at = occurredAt;
    const eventRow: CredentialEventRow = {
      id: crypto.randomUUID(),
      credential_id: credential.id,
      event_type: event,
      occurred_at: occurredAt,
      actor_user_id: actor,
      reason,
      evidence_json: null,
      created_at: occurredAt,
    };
    memory.credentialEvents.push(eventRow);
    const payload = { credential: memoryToApi(row), event: eventRow };
    await emitEvent(TOPIC_CREDENTIAL_TRANSITIONED, credential.id, payload, TOPIC_CREDENTIAL_TRANSITIONED);
    res.json(singleEnvelope(payload));
  } catch (err) {
    next(err);
  }
});

credentialsRouter.get('/education/tracks', (_req, res) => {
  res.json(listEnvelope([...EDUCATION_TRACKS]));
});
