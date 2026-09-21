import { randomUUID } from 'node:crypto';
import type { ReputationRecord, CredentialState } from './schema.js';

const records = new Map<string, ReputationRecord>();

const TRANSITIONS: Record<CredentialState, Partial<Record<string, CredentialState>>> = {
  active: { drift_flagged: 'stale', lapse: 'lapsed' },
  expiring: { drift_flagged: 'stale', lapse: 'lapsed' },
  stale: { lapse: 'lapsed' },
  lapsed: {},
};

export function createReputationRecord(input: { spaceId: string; credentialType: string }): ReputationRecord {
  const now = new Date();
  const record: ReputationRecord = {
    id: randomUUID(),
    spaceId: input.spaceId,
    credentialType: input.credentialType,
    state: 'active',
    score: 0,
    issuedAt: now,
    expiresAt: null,
  };
  records.set(record.id, record);
  return record;
}

export function getReputation(id: string): ReputationRecord | undefined {
  return records.get(id);
}

export function transitionState(id: string, event: string): ReputationRecord | null {
  const record = records.get(id);
  if (!record) return null;
  const next = TRANSITIONS[record.state]?.[event];
  if (!next) return null;
  record.state = next as CredentialState;
  record.expiresAt = event === 'lapse' ? new Date() : record.expiresAt;
  return record;
}