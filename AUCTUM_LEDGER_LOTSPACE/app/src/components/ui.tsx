import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { ProblemError } from '../api/http'

export function PageHeader(props: { overline?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {props.overline ? <p className="overline mb-1">{props.overline}</p> : null}
        <h1 className="font-display text-3xl font-semibold text-ink-900">{props.title}</h1>
        {props.subtitle ? <p className="mt-1 max-w-2xl text-sm text-ink-900/70">{props.subtitle}</p> : null}
      </div>
      {props.actions ? <div className="flex items-center gap-2">{props.actions}</div> : null}
    </header>
  )
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-ink-900/60" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label ?? t('states.loading')}</span>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title?: string; description?: string; action?: ReactNode }) {
  const { t } = useTranslation('common')
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-ink-900/30" aria-hidden />
      <p className="font-display text-lg text-ink-900">{title ?? t('states.empty')}</p>
      {description ? <p className="max-w-md text-sm text-ink-900/60">{description}</p> : null}
      {action}
    </div>
  )
}

/** Renders an API failure through the errors namespace — never raw error.message. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation('errors')
  const key = error instanceof ProblemError ? error.i18nKey.replace(/^errors\./, '') : 'unknown'
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden />
      <p className="font-display text-lg text-ink-900">{t('title')}</p>
      <p className="max-w-md text-sm text-ink-900/70">{t(key)}</p>
      {onRetry ? (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          {t('cta.retry')}
        </button>
      ) : null}
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-900/60">{hint}</p> : null}
    </div>
  )
}
