import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, ProblemError, problemI18nKey } from '../api/http'
import { fetchCredentials, transitionCredential } from '../api/client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unwraps the { data, page } list envelope', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        data: [{ id: 'c1', state: 'active' }],
        page: { nextCursor: null, hasMore: false },
      }),
    )
    const rows = await fetchCredentials()
    expect(rows).toHaveLength(1)
    expect(rows[0].state).toBe('active')
  })

  it('sends Idempotency-Key (uuid) on POST and PATCH, never on GET', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse(200, { data: {} })))

    await http.post('/x', { a: 1 })
    let headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['Idempotency-Key']).toMatch(UUID_RE)
    expect(headers['Content-Type']).toBe('application/json')

    await http.patch('/x', { a: 2 })
    headers = vi.mocked(fetch).mock.calls[1][1]?.headers as Record<string, string>
    expect(headers['Idempotency-Key']).toMatch(UUID_RE)

    await http.get('/x')
    headers = vi.mocked(fetch).mock.calls[2][1]?.headers as Record<string, string>
    expect(headers['Idempotency-Key']).toBeUndefined()
  })

  it('generates a fresh idempotency key per mutating call', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse(200, { data: {} })))
    await http.post('/x', {})
    await http.post('/x', {})
    const headerOf = (i: number): Record<string, string> => {
      const init = vi.mocked(fetch).mock.calls[i][1]
      return (init?.headers ?? {}) as Record<string, string>
    }
    const keyA = headerOf(0)['Idempotency-Key']
    const keyB = headerOf(1)['Idempotency-Key']
    expect(keyA).not.toBe(keyB)
  })

  it('maps RFC 9457 Problem JSON to a typed ProblemError with i18n key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(422, {
        type: 'https://api.auctumledger.io/problems/AL-CAT-1001',
        title: 'AL-CAT-1001',
        status: 422,
        code: 'AL-CAT-1001',
        detail: 'Insufficient inventory',
      }),
    )
    const err = await http.post('/catalog/lots/l1/reservations', {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ProblemError)
    const problem = err as ProblemError
    expect(problem.code).toBe('AL-CAT-1001')
    expect(problem.status).toBe(422)
    expect(problem.i18nKey).toBe('errors.insufficientInventory')
  })

  it('maps non-problem 5xx to SERVER_ERROR and 409 education conflicts stay typed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const serverErr = await http.get('/x').catch((e: unknown) => e)
    expect(serverErr).toBeInstanceOf(ProblemError)
    expect((serverErr as ProblemError).i18nKey).toBe('errors.codes.SERVER_ERROR')

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(409, {
        type: 'https://api.auctumledger.io/problems/AL-EDU-1002',
        title: 'AL-EDU-1002',
        status: 409,
        code: 'AL-EDU-1002',
      }),
    )
    const eduErr = await transitionCredential('cred-1', { event: 'renew' }).catch((e: unknown) => e)
    expect(eduErr).toBeInstanceOf(ProblemError)
    expect((eduErr as ProblemError).code).toBe('AL-EDU-1002')
    expect((eduErr as ProblemError).status).toBe(409)
  })

  it('maps network failure to NET_OFFLINE without leaking the raw error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'))
    const err = await http.get('/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ProblemError)
    expect((err as ProblemError).i18nKey).toBe('errors.codes.NET_OFFLINE')
  })

  it('posts credential transitions to the transitions endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { data: { id: 'cred-9', state: 'active', state_name: 'active' } }),
    )
    const updated = await transitionCredential('cred-9', { event: 'renew', reason: 'recalibrated' })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/credentials/cred-9/transitions')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ event: 'renew', reason: 'recalibrated' })
    expect(updated.id).toBe('cred-9')
  })
})

describe('problemI18nKey', () => {
  it('covers the observed AL-* codes', () => {
    expect(problemI18nKey('AL-GEN-1003', 422)).toBe('errors.codes.IDEMPOTENCY_CONFLICT')
    expect(problemI18nKey('AL-CAT-1001', 422)).toBe('errors.insufficientInventory')
    expect(problemI18nKey('AL-CAT-1002', 404)).toBe('errors.codes.LOT_NOT_FOUND')
    expect(problemI18nKey('AL-GEN-1004', 400)).toBe('errors.codes.VAL_REQUIRED_FIELD')
  })

  it('falls back by status for unknown codes', () => {
    expect(problemI18nKey('AL-XXX-9999', 401)).toBe('errors.codes.AUTH_SESSION_EXPIRED')
    expect(problemI18nKey('AL-XXX-9999', 403)).toBe('errors.codes.AUTH_FORBIDDEN')
    expect(problemI18nKey('AL-XXX-9999', 429)).toBe('errors.codes.RATE_LIMITED')
    expect(problemI18nKey('AL-XXX-9999', 503)).toBe('errors.codes.SERVER_ERROR')
    expect(problemI18nKey('AL-XXX-9999', 418)).toBe('errors.unknown')
  })
})
