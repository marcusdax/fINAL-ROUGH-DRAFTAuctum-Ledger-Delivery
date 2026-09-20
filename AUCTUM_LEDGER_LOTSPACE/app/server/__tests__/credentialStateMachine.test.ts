import { describe, expect, it } from 'vitest';
import {
  CREDENTIAL_EVENTS,
  CREDENTIAL_STATES,
  InvalidTransitionError,
  RENEWAL_TERM_MS,
  canTransition,
  isCredentialEvent,
  isCredentialState,
  nextState,
  transitionCredential,
  type CredentialEvent,
  type CredentialState,
} from '../lib/credentialStateMachine.js';

describe('credentialStateMachine (spec §5.2)', () => {
  describe('valid transitions', () => {
    it('renew from active stays active', () => {
      const result = transitionCredential('active', 'renew');
      expect(result.state).toBe('active');
    });

    it('renew extends expires_at by one year', () => {
      const now = new Date('2026-09-13T00:00:00.000Z');
      const result = transitionCredential('active', 'renew', now);
      expect(result.expiresAt?.getTime()).toBe(now.getTime() + RENEWAL_TERM_MS);
      expect(result.expiresAt?.toISOString()).toBe('2027-09-13T00:00:00.000Z');
    });

    it.each(['active', 'expiring'] as const)(
      'drift_flagged from %s moves to stale',
      (from: CredentialState) => {
        const result = transitionCredential(from, 'drift_flagged');
        expect(result.state).toBe('stale');
        expect(result.expiresAt).toBeNull();
      },
    );

    it.each(['active', 'expiring', 'stale'] as const)(
      'lapse from %s moves to lapsed',
      (from: CredentialState) => {
        const result = transitionCredential(from, 'lapse');
        expect(result.state).toBe('lapsed');
        expect(result.expiresAt).toBeNull();
      },
    );
  });

  describe('invalid transitions are rejected', () => {
    it('renew from expiring is invalid (expiring is a scheduled/system state)', () => {
      expect(() => transitionCredential('expiring', 'renew')).toThrow(InvalidTransitionError);
    });

    it('renew from stale is invalid', () => {
      expect(() => transitionCredential('stale', 'renew')).toThrow(InvalidTransitionError);
    });

    it('drift_flagged from stale is invalid (already stale)', () => {
      expect(() => transitionCredential('stale', 'drift_flagged')).toThrow(InvalidTransitionError);
    });

    it.each(['renew', 'drift_flagged', 'lapse'] as const)(
      '%s from lapsed is invalid (lapsed is terminal)',
      (event: CredentialEvent) => {
        expect(() => transitionCredential('lapsed', event)).toThrow(InvalidTransitionError);
      },
    );

    it('InvalidTransitionError carries code AL-EDU-1002 and context', () => {
      try {
        transitionCredential('lapsed', 'renew');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError);
        const e = err as InvalidTransitionError;
        expect(e.code).toBe('AL-EDU-1002');
        expect(e.from).toBe('lapsed');
        expect(e.event).toBe('renew');
      }
    });
  });

  describe('exhaustive transition table', () => {
    // The complete valid set per spec §5.2 — anything outside this must fail.
    const VALID: Array<[CredentialState, CredentialEvent, CredentialState]> = [
      ['active', 'renew', 'active'],
      ['active', 'drift_flagged', 'stale'],
      ['active', 'lapse', 'lapsed'],
      ['expiring', 'drift_flagged', 'stale'],
      ['expiring', 'lapse', 'lapsed'],
      ['stale', 'lapse', 'lapsed'],
    ];

    it('exactly the spec §5.2 transitions are allowed', () => {
      const validKeys = new Set(VALID.map(([s, e]) => `${s}:${e}`));
      for (const state of CREDENTIAL_STATES) {
        for (const event of CREDENTIAL_EVENTS) {
          const key = `${state}:${event}`;
          if (validKeys.has(key)) {
            const [, , expected] = VALID.find(([s, e]) => s === state && e === event)!;
            expect(nextState(state, event), key).toBe(expected);
            expect(canTransition(state, event), key).toBe(true);
            expect(() => transitionCredential(state, event), key).not.toThrow();
          } else {
            expect(nextState(state, event), key).toBeNull();
            expect(canTransition(state, event), key).toBe(false);
            expect(() => transitionCredential(state, event), key).toThrow(InvalidTransitionError);
          }
        }
      }
    });
  });

  describe('type guards', () => {
    it('isCredentialState accepts only known states', () => {
      for (const s of CREDENTIAL_STATES) expect(isCredentialState(s)).toBe(true);
      expect(isCredentialState('suspended')).toBe(false);
      expect(isCredentialState(undefined)).toBe(false);
      expect(isCredentialState(42)).toBe(false);
    });

    it('isCredentialEvent accepts only known events', () => {
      for (const e of CREDENTIAL_EVENTS) expect(isCredentialEvent(e)).toBe(true);
      expect(isCredentialEvent('suspend')).toBe(false);
      expect(isCredentialEvent(null)).toBe(false);
    });
  });
});
