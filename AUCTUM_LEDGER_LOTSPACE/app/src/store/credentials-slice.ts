import type { StateCreator } from 'zustand'
import * as api from '../api/client'
import { ProblemError } from '../api/http'
import type { Credential, CredentialEvent, CredentialEventName } from '../types/api'
import type { AsyncStatus } from './catalog-slice'

export interface CredentialsSlice {
  credentials: Credential[]
  credentialsStatus: AsyncStatus
  credentialsError: ProblemError | null
  eventsByCredentialId: Record<string, CredentialEvent[]>
  eventsStatus: AsyncStatus
  transitionPendingId: string | null
  fetchCredentials: () => Promise<void>
  fetchCredentialEvents: (credentialId: string) => Promise<void>
  transitionCredential: (
    credentialId: string,
    event: CredentialEventName,
    reason?: string,
  ) => Promise<Credential>
}

export const createCredentialsSlice: StateCreator<CredentialsSlice, [], [], CredentialsSlice> = (
  set,
  get,
) => ({
  credentials: [],
  credentialsStatus: 'idle',
  credentialsError: null,
  eventsByCredentialId: {},
  eventsStatus: 'idle',
  transitionPendingId: null,

  fetchCredentials: async () => {
    set({ credentialsStatus: 'loading', credentialsError: null })
    try {
      const credentials = await api.fetchCredentials()
      set({ credentials, credentialsStatus: 'ready' })
    } catch (error) {
      set({
        credentialsStatus: 'error',
        credentialsError: error instanceof ProblemError ? error : null,
      })
    }
  },

  fetchCredentialEvents: async (credentialId) => {
    set({ eventsStatus: 'loading' })
    try {
      const events = await api.fetchCredentialEvents(credentialId)
      set({
        eventsByCredentialId: { ...get().eventsByCredentialId, [credentialId]: events },
        eventsStatus: 'ready',
      })
    } catch {
      set({ eventsStatus: 'error' })
    }
  },

  transitionCredential: async (credentialId, event, reason) => {
    set({ transitionPendingId: credentialId })
    try {
      const updated = await api.transitionCredential(credentialId, { event, reason })
      set({
        credentials: get().credentials.map((c) => (c.id === updated.id ? updated : c)),
      })
      // Audit trail changed — drop the cached events so the drawer refetches.
      const eventsById = { ...get().eventsByCredentialId }
      delete eventsById[credentialId]
      set({ eventsByCredentialId: eventsById })
      return updated
    } finally {
      set({ transitionPendingId: null })
    }
  },
})
