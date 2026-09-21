import { createReputationRecord, transitionState } from '../reputation.service.js';

describe('Reputation service', () => {
  it('creates a reputation record in active state', () => {
    const record = createReputationRecord({ spaceId: 'space-1', credentialType: 'green_buyer_level_1' });
    expect(record.id).toBeDefined();
    expect(record.state).toBe('active');
    expect(record.score).toBe(0);
  });

  it('transitions from active to expiring on drift_flagged', () => {
    const record = createReputationRecord({ spaceId: 'space-2', credentialType: 'sample_evaluation' });
    const updated = transitionState(record.id, 'drift_flagged');
    expect(updated?.state).toBe('stale');
  });

  it('lapses a credential', () => {
    const record = createReputationRecord({ spaceId: 'space-3', credentialType: 'roaster_certification' });
    const updated = transitionState(record.id, 'lapse');
    expect(updated?.state).toBe('lapsed');
  });

  it('does not transition from lapsed', () => {
    const record = createReputationRecord({ spaceId: 'space-4', credentialType: 'test' });
    transitionState(record.id, 'lapse');
    const updated = transitionState(record.id, 'renew');
    expect(updated).toBeNull();
  });
});