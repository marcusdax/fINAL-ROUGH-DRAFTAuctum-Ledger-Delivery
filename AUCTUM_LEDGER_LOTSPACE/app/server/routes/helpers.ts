/** Shared response-envelope helpers (brief §5). */

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

/** List envelope; cursors stubbed null/false pending real cursor pagination. */
export function listEnvelope<T>(data: T[]): { data: T[]; page: PageInfo } {
  return { data, page: { nextCursor: null, hasMore: false } };
}

export function singleEnvelope<T>(data: T): { data: T } {
  return { data };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  return undefined;
}
