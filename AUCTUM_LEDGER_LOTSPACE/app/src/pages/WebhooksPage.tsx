import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createWebhook, fetchWebhooks } from '../api/client'
import { ProblemError } from '../api/http'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtDate } from '../lib/format'
import type { WebhookSubscription } from '../types/api'

const KNOWN_EVENTS = [
  'al.crm.roaster_registered',
  'al.orders.order_created',
  'al.sample_kit.requested',
  'al.campaign.created',
  'al.automation-rule.created',
  'al.referral.qualified',
  'al.education.credential_transitioned',
]

export default function WebhooksPage() {
  const { t } = useTranslation(['common', 'webhooks', 'errors'])
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchWebhooks()
      .then((rows) => {
        if (cancelled) return
        setWebhooks(rows)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const load = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  const submit = async () => {
    setPending(true)
    setFormError(null)
    try {
      const created = await createWebhook({ url, events: selected })
      setWebhooks((rows) => [...rows, created])
      setUrl('')
      setSelected([])
    } catch (err) {
      setFormError(err instanceof ProblemError ? t(err.i18nKey) : t('errors:unknown'))
    } finally {
      setPending(false)
    }
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={load} />

  return (
    <div>
      <PageHeader title={t('common:nav.webhooks')} />

      <form
        className="card mb-5 space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <h2 className="font-display text-lg font-semibold text-ink-900">{t('webhooks:create')}</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
            URL
          </span>
          <input
            className="input"
            type="url"
            required
            placeholder="https://roastery.example.com/hooks/auctum"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <fieldset>
          <legend className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
            Events
          </legend>
          <div className="flex flex-wrap gap-2">
            {KNOWN_EVENTS.map((event) => (
              <label
                key={event}
                className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                  selected.includes(event)
                    ? 'border-green-700/40 bg-green-100 text-green-800'
                    : 'border-ink-700/20 bg-paper text-ink-900/70'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected.includes(event)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked ? [...current, event] : current.filter((v) => v !== event),
                    )
                  }
                />
                {event}
              </label>
            ))}
          </div>
        </fieldset>
        {formError ? (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn-primary" disabled={pending || !url || selected.length === 0}>
            {pending ? t('common:states.loading') : t('common:buttons.submit')}
          </button>
        </div>
      </form>

      {webhooks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>URL</th>
                <th>Events</th>
                <th>{t('common:labels.status', 'Status')}</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((hook) => (
                <tr key={hook.id}>
                  <td className="max-w-xs truncate font-mono text-xs">{hook.url}</td>
                  <td>
                    <ul className="flex flex-wrap gap-1">
                      {hook.events.map((event) => (
                        <li key={event} className="rounded-full bg-parchment-100 px-2 py-0.5 font-mono text-[11px] text-ink-900/80">
                          {event}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="capitalize">{hook.status}</td>
                  <td className="text-ink-900/60">{fmtDate(hook.created_at, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
