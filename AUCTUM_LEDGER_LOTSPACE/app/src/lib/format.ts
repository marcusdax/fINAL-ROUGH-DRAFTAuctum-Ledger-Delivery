/**
 * Intl-only formatting helpers (brief §8 parity rules).
 * Dates/numbers/currency always go through Intl with the active locale;
 * currency stays USD. SCA cup scores render with at most one decimal and
 * are never rounded up.
 */
import { DEFAULT_LOCALE, type SupportedLocale } from '../i18n'

export function fmtNumber(value: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function fmtCurrency(cents: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function fmtPricePerLb(cents: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  const dollars = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return `${dollars}/lb`
}

/** SCA cup score: one decimal max, never round up (truncate to tenths). */
export function fmtCupScore(score: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  const truncated = Math.floor(score * 10) / 10
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(truncated)
}

export function fmtDate(
  value: string | Date,
  locale: SupportedLocale | string = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function fmtDateTime(value: string | Date, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function fmtList(values: string[], locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(values)
}

export function fmtPercent(value: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

/** masl elevation, e.g. "1,900–2,200 masl" rendered by callers per part. */
export function fmtElevation(masl: number, locale: SupportedLocale | string = DEFAULT_LOCALE): string {
  return `${fmtNumber(masl, locale)} masl`
}
