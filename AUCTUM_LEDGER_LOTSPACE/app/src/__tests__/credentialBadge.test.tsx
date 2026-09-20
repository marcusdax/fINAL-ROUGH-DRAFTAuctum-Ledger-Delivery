import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CredentialBadge from '../components/CredentialBadge'
import { CREDENTIAL_STATES } from '../types/api'

describe('CredentialBadge', () => {
  it('renders every credential state with its label and state hook', () => {
    const labels: Record<(typeof CREDENTIAL_STATES)[number], string> = {
      active: 'Active',
      expiring: 'Expiring',
      stale: 'Stale',
      lapsed: 'Lapsed',
    }
    for (const state of CREDENTIAL_STATES) {
      const { unmount } = render(<CredentialBadge state={state} />)
      const badge = screen.getByTestId('credential-badge')
      expect(badge).toHaveTextContent(labels[state])
      expect(badge).toHaveAttribute('data-state', state)
      unmount()
    }
  })

  it('uses distinct accessible colors per state', () => {
    const classes = new Map<string, string>()
    for (const state of CREDENTIAL_STATES) {
      const { unmount } = render(<CredentialBadge state={state} />)
      const badge = screen.getByTestId('credential-badge')
      classes.set(state, badge.className)
      unmount()
    }
    // All four states must style differently from each other.
    expect(new Set(classes.values()).size).toBe(CREDENTIAL_STATES.length)
    expect(classes.get('active')).toContain('green')
    expect(classes.get('expiring')).toContain('amber')
    expect(classes.get('stale')).toContain('brass')
    expect(classes.get('lapsed')).toContain('red-700')
  })

  it('renders unknown enum values raw rather than a broken key', () => {
    render(<CredentialBadge state={'pending_review' as never} />)
    const badge = screen.getByTestId('credential-badge')
    expect(badge).toHaveTextContent('pending_review')
    expect(badge.className).not.toContain('undefined')
  })
})
