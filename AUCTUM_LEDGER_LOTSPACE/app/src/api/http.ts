/**
 * Low-level fetch wrapper (brief §6 / contract §4).
 * - Base URL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
 * - POST/PATCH carry `Idempotency-Key: crypto.randomUUID()`
 * - RFC 9457 Problem JSON is mapped to typed ProblemError with an
 *   i18n key into the `errors` namespace (never render raw error.message).
 */
import type { Problem } from '../types/api'

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ProblemError extends Error {
  readonly status: number
  readonly code: string
  readonly problem: Problem | null
  /** Key into the `errors` i18n namespace for user-facing rendering. */
  readonly i18nKey: string

  constructor(problem: Problem | null, status: number, fallbackCode = 'AL-GEN-1000') {
    const code = problem?.code ?? problem?.title ?? fallbackCode
    super(problem?.detail ?? code)
    this.name = 'ProblemError'
    this.status = problem?.status ?? status
    this.code = code
    this.problem = problem
    this.i18nKey = problemI18nKey(code, this.status)
  }
}

/** Map AL-* problem codes / HTTP statuses onto keys covered by errors.codes.* */
export function problemI18nKey(code: string, status: number): string {
  const byCode: Record<string, string> = {
    'AL-GEN-1003': 'errors.codes.IDEMPOTENCY_CONFLICT',
    'AL-GEN-1004': 'errors.codes.VAL_REQUIRED_FIELD',
    'AL-CAT-1001': 'errors.insufficientInventory',
    'AL-CAT-1002': 'errors.codes.LOT_NOT_FOUND',
    'AL-GEN-1005': 'errors.codes.LOT_NOT_FOUND',
    NET_OFFLINE: 'errors.codes.NET_OFFLINE',
    NET_TIMEOUT: 'errors.codes.NET_TIMEOUT',
  }
  if (byCode[code]) return byCode[code]
  if (status === 401) return 'errors.codes.AUTH_SESSION_EXPIRED'
  if (status === 403) return 'errors.codes.AUTH_FORBIDDEN'
  if (status === 408 || status === 504) return 'errors.codes.NET_TIMEOUT'
  if (status === 429) return 'errors.codes.RATE_LIMITED'
  if (status === 400) return 'errors.codes.VAL_REQUIRED_FIELD'
  if (status === 422) return 'errors.codes.IDEMPOTENCY_CONFLICT'
  if (status >= 500) return 'errors.codes.SERVER_ERROR'
  return 'errors.unknown'
}

export function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.type === 'string' &&
    v.type.startsWith('https://api.auctumledger.io/problems/') &&
    typeof v.status === 'number'
  )
}

function isMutating(method: string): boolean {
  return method === 'POST' || method === 'PATCH'
}

export interface RequestOptions {
  /** Caller-supplied idempotency key (rarely needed — one is generated). */
  idempotencyKey?: string
  signal?: AbortSignal
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (isMutating(method)) {
    headers['Idempotency-Key'] = options.idempotencyKey ?? crypto.randomUUID()
  }

  let res: Response
  try {
    const init: RequestInit = { method, headers, signal: options.signal }
    if (body !== undefined) init.body = JSON.stringify(body)
    res = await fetch(url, init)
  } catch {
    // Network failure — never leak the raw error to the UI.
    throw new ProblemError(null, 0, 'NET_OFFLINE')
  }

  const text = await res.text()
  let payload: unknown = null
  if (text.length > 0) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    throw new ProblemError(isProblem(payload) ? payload : null, res.status)
  }

  return payload as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
}
