/**
 * Typed API client for the /api/v1 surface (brief §5 route table).
 * Lists unwrap the `{ data, page }` envelope; single resources unwrap `{ data }`.
 */
import { http } from './http'
import type {
  AutomationRule,
  Campaign,
  ChatMessage,
  ChatResponse,
  Credential,
  CredentialEvent,
  CredentialEventName,
  CredentialStateName,
  CurriculumTrack,
  ItemEnvelope,
  ListEnvelope,
  Lot,
  Order,
  Reservation,
  Roaster,
  SampleKit,
  WebhookSubscription,
} from '../types/api'

export const AI_PROXY_URL: string = import.meta.env.VITE_AI_PROXY_URL ?? 'http://localhost:3001'

async function list<T>(path: string): Promise<T[]> {
  const envelope = await http.get<ListEnvelope<T>>(path)
  return envelope.data
}

async function item<T>(path: string): Promise<T> {
  const envelope = await http.get<ItemEnvelope<T>>(path)
  return envelope.data
}

// -- Catalog ---------------------------------------------------------------

export const fetchLots = () => list<Lot>('/catalog/lots')
export const fetchLot = (id: string) => item<Lot>(`/catalog/lots/${encodeURIComponent(id)}`)
export const reserveLot = (lotId: string, body: { roaster_id: string; quantity_lbs: number }) =>
  http
    .post<ItemEnvelope<Reservation>>(`/catalog/lots/${encodeURIComponent(lotId)}/reservations`, body)
    .then((envelope) => envelope.data)

// -- Roasters / CRM ---------------------------------------------------------

export const fetchRoasters = () => list<Roaster>('/roasters')
export const fetchRoaster = (id: string) => item<Roaster>(`/roasters/${encodeURIComponent(id)}`)
export const logIntervention = (
  roasterId: string,
  body: { intervention_type: string; note?: string; outcome?: string },
) =>
  http
    .post<ItemEnvelope<Roaster>>(`/roasters/${encodeURIComponent(roasterId)}/interventions`, body)
    .then((envelope) => envelope.data)

// -- Engagement -------------------------------------------------------------

export const fetchCampaigns = () => list<Campaign>('/campaigns')
export const fetchAutomationRules = () => list<AutomationRule>('/automation-rules')
export const fetchSampleKits = () => list<SampleKit>('/sample-kits')
export const requestSampleKit = (body: { roaster_id: string; lots: unknown[] }) =>
  http
    .post<ItemEnvelope<SampleKit>>('/sample-kits/request', body)
    .then((envelope) => envelope.data)

// -- Commerce ---------------------------------------------------------------

export const fetchOrders = () => list<Order>('/orders')

// -- Intelligence -----------------------------------------------------------

export const fetchWebhooks = () => list<WebhookSubscription>('/webhooks')
export const createWebhook = (body: { url: string; events: string[] }) =>
  http
    .post<ItemEnvelope<WebhookSubscription>>('/webhooks', body)
    .then((envelope) => envelope.data)

// -- Education: credentials -------------------------------------------------

type RawCredential = Partial<Credential> & {
  state_name?: CredentialStateName
  holderName?: string
  credentialType?: string
}

/** Tolerate both joined (`state_name`) and camelCase server rows. */
export function normalizeCredential(raw: RawCredential): Credential {
  const state = (raw.state ?? raw.state_name ?? 'active') as CredentialStateName
  return {
    id: String(raw.id ?? ''),
    holder_name: raw.holder_name ?? raw.holderName ?? '',
    credential_type: raw.credential_type ?? raw.credentialType ?? '',
    issuer: raw.issuer ?? null,
    state_id: raw.state_id ?? 0,
    state,
    issued_at: raw.issued_at ?? null,
    expires_at: raw.expires_at ?? null,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
  }
}

export async function fetchCredentials(): Promise<Credential[]> {
  const rows = await list<RawCredential>('/credentials')
  return rows.map(normalizeCredential)
}

export const fetchCredentialEvents = (credentialId: string) =>
  list<CredentialEvent>(`/credentials/${encodeURIComponent(credentialId)}/events`).then((rows) =>
    // Server audit rows use event_type/actor_user_id; normalize to the UI shape.
    rows.map((row) => ({
      ...row,
      event: row.event ?? row.event_type ?? '',
      actor: row.actor ?? row.actor_user_id ?? null,
      created_at: row.created_at ?? row.occurred_at ?? '',
    })),
  )

export const transitionCredential = (
  credentialId: string,
  body: { event: CredentialEventName; reason?: string },
) =>
  http
    .post<ItemEnvelope<RawCredential & { credential?: RawCredential }>>(
      `/credentials/${encodeURIComponent(credentialId)}/transitions`,
      body,
    )
    // Server returns { data: { credential, event } }; tolerate a bare credential too.
    .then((envelope) => normalizeCredential(envelope.data.credential ?? envelope.data))

// -- Education: curriculum tracks --------------------------------------------

export const fetchTracks = () => list<CurriculumTrack>('/education/tracks')

// -- AI chat proxy -----------------------------------------------------------

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const res = await http.post<ChatResponse>(`${AI_PROXY_URL}/api/v1/chat`, { messages })
  const content =
    res.data?.choices?.[0]?.message?.content ??
    res.data?.message ??
    res.data?.reply ??
    res.data?.content ??
    res.message ??
    res.reply
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('Empty chat response')
  }
  return content
}
