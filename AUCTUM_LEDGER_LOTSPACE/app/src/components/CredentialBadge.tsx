import type { CredentialStateName } from '../types/api'

/**
 * Credential state badge — education wallet.
 * State colors (contract §4): active=green, expiring=amber, stale=brass,
 * lapsed=red-700. Text colors are the 700 shades on 100-shade chips,
 * meeting WCAG AA contrast on parchment/paper surfaces.
 *
 * State names are domain terms seeded by migration
 * 20260913_01_credential_state_machine.sql; locale files ship no
 * credential namespace, so they render as raw enum labels per the
 * i18n parity rules (unknown enum values render raw, never broken keys).
 */
const STATE_PRESENTATION: Record<
  CredentialStateName,
  { label: string; chip: string; dot: string }
> = {
  active: {
    label: 'Active',
    chip: 'border-green-700/30 bg-green-100 text-green-800',
    dot: 'bg-green-600',
  },
  expiring: {
    label: 'Expiring',
    chip: 'border-amber-700/30 bg-amber-100 text-amber-700',
    dot: 'bg-amber-600',
  },
  stale: {
    label: 'Stale',
    chip: 'border-brass-700/30 bg-brass-100 text-brass-700',
    dot: 'bg-brass-600',
  },
  lapsed: {
    label: 'Lapsed',
    chip: 'border-red-700/30 bg-red-100 text-red-700',
    dot: 'bg-red-700',
  },
}

export function CredentialBadge({ state }: { state: CredentialStateName }) {
  const presentation = STATE_PRESENTATION[state] ?? {
    label: state, // unknown enum values render raw per parity rules
    chip: 'border-ink-700/25 bg-parchment-100 text-ink-700',
    dot: 'bg-ink-700/50',
  }
  return (
    <span
      data-testid="credential-badge"
      data-state={state}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${presentation.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${presentation.dot}`} aria-hidden />
      {presentation.label}
    </span>
  )
}

export default CredentialBadge
