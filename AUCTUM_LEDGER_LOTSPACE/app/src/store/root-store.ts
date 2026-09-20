import { create } from 'zustand'
import { createCatalogSlice, type CatalogSlice } from './catalog-slice'
import { createCredentialsSlice, type CredentialsSlice } from './credentials-slice'

export type AppStore = CatalogSlice & CredentialsSlice

export const useAppStore = create<AppStore>()((...args) => ({
  ...createCatalogSlice(...args),
  ...createCredentialsSlice(...args),
}))
