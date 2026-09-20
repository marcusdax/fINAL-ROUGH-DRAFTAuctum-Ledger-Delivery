/**
 * Credential state machine (spec §5.2) — pure, unit-testable domain logic.
 *
 * States: active → expiring → stale → lapsed (lapsed is terminal).
 *   renew:         only from `active` → stays `active`, expires_at + 1 year.
 *                  (`expiring` is a scheduled/system state, not a renew result.)
 *   drift_flagged: from `active` | `expiring` → `stale`.
 *   lapse:         from `active` | `expiring` | `stale` → `lapsed`.
 *   from `lapsed`: no transitions.
 */

export const CREDENTIAL_STATES = ['active', 'expiring', 'stale', 'lapsed'] as const;
export type CredentialState = (typeof CREDENTIAL_STATES)[number];

export const CREDENTIAL_EVENTS = ['renew', 'drift_flagged', 'lapse'] as const;
export type CredentialEvent = (typeof CREDENTIAL_EVENTS)[number];

export const RENEWAL_TERM_MS = 365 * 24 * 60 * 60 * 1000;

const TRANSITIONS: Record<CredentialState, Partial<Record<CredentialEvent, CredentialState>>> = {
  active: { renew: 'active', drift_flagged: 'stale', lapse: 'lapsed' },
  expiring: { drift_flagged: 'stale', lapse: 'lapsed' },
  stale: { lapse: 'lapsed' },
  lapsed: {},
};

export class InvalidTransitionError extends Error {
  readonly code = 'AL-EDU-1002' as const;
  readonly from: CredentialState;
  readonly event: string;

  constructor(from: CredentialState, event: string) {
    super(`Invalid credential transition: event '${event}' from state '${from}'`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.event = event;
  }
}

export function isCredentialState(value: unknown): value is CredentialState {
  return typeof value === 'string' && (CREDENTIAL_STATES as readonly string[]).includes(value);
}

export function isCredentialEvent(value: unknown): value is CredentialEvent {
  return typeof value === 'string' && (CREDENTIAL_EVENTS as readonly string[]).includes(value);
}

export function canTransition(from: CredentialState, event: CredentialEvent): boolean {
  return TRANSITIONS[from][event] !== undefined;
}

export function nextState(from: CredentialState, event: CredentialEvent): CredentialState | null {
  return TRANSITIONS[from][event] ?? null;
}

export interface TransitionResult {
  state: CredentialState;
  /** New expiry timestamp; only set by `renew` (expires_at + 1 year). */
  expiresAt: Date | null;
}

/**
 * Apply an event to a credential state.
 * @throws InvalidTransitionError for any transition not allowed by spec §5.2.
 */
export function transitionCredential(
  from: CredentialState,
  event: CredentialEvent,
  now: Date = new Date(),
): TransitionResult {
  const to = nextState(from, event);
  if (to === null) {
    throw new InvalidTransitionError(from, event);
  }
  return {
    state: to,
    expiresAt: event === 'renew' ? new Date(now.getTime() + RENEWAL_TERM_MS) : null,
  };
}
