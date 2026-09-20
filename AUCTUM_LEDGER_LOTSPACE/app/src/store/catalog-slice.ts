import type { StateCreator } from 'zustand'
import * as api from '../api/client'
import { ProblemError } from '../api/http'
import type { Lot, Reservation } from '../types/api'

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CatalogSlice {
  lots: Lot[]
  lotsStatus: AsyncStatus
  lotsError: ProblemError | null
  reservations: Reservation[]
  reservePending: boolean
  fetchLots: () => Promise<void>
  reserveLot: (lotId: string, roasterId: string, quantityLbs: number) => Promise<Reservation>
}

export const createCatalogSlice: StateCreator<CatalogSlice, [], [], CatalogSlice> = (set, get) => ({
  lots: [],
  lotsStatus: 'idle',
  lotsError: null,
  reservations: [],
  reservePending: false,

  fetchLots: async () => {
    set({ lotsStatus: 'loading', lotsError: null })
    try {
      const lots = await api.fetchLots()
      set({ lots, lotsStatus: 'ready' })
    } catch (error) {
      set({
        lotsStatus: 'error',
        lotsError: error instanceof ProblemError ? error : null,
      })
    }
  },

  reserveLot: async (lotId, roasterId, quantityLbs) => {
    // Idempotency-Key is attached by the http layer; a retried call replays
    // server-side instead of double-decrementing inventory.
    set({ reservePending: true })
    try {
      const reservation = await api.reserveLot(lotId, {
        roaster_id: roasterId,
        quantity_lbs: quantityLbs,
      })
      set({
        reservations: [...get().reservations, reservation],
        lots: get().lots.map((lot) =>
          lot.id === lotId
            ? { ...lot, available_quantity_lbs: Math.max(0, lot.available_quantity_lbs - quantityLbs) }
            : lot,
        ),
      })
      return reservation
    } finally {
      set({ reservePending: false })
    }
  },
})
