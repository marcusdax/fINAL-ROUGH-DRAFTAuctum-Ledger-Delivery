import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchRoaster, logIntervention } from '../api/client'
import { ProblemError } from '../api/http'
import { ErrorState, LoadingState, StatCard } from '../components/ui'
import i18n from '../i18n'
import { fmtCurrency, fmtDateTime, fmtNumber } from '../lib/format'
import type { Roaster } from '../types/api'
import { ChurnTierBadge } from './RoastersPage'

const INTERVENTION_TYPES = ['email_campaign', 'phone_call', 'sample_kit', 'pricing_review', 'site_visit']

/** Roaster detail — profile stats + interventions timeline + log form. */
export default function RoasterDetailPage() {
  const { t } = useTranslation(['common', 'roasters', 'dashboard', 'errors'])
  const { id, locale } = useParams<{ id: string; locale: string }>()
  const [roaster, setRoaster] = useState<Roaster | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)
  const [type, setType] = useState(INTERVENTION_TYPES[0])
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchRoaster(id)
      .then((data) => {
        if (cancelled) return
        setRoaster(data)
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
  }, [id, reloadKey])

  const load = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'error' || !roaster) return <ErrorState error={error} onRetry={load} />

  const interventions = [...(roaster.interventions ?? [])].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )

  const submit = async () => {
    if (!id) return
    setPending(true)
    setFormError(null)
    try {
      const updated = await logIntervention(id, { intervention_type: type, note: note || undefined })
      setRoaster(updated)
      setNote('')
    } catch (err) {
      setFormError(err instanceof ProblemError ? t(err.i18nKey) : t('errors:unknown'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-3">
        <Link to={`/${locale}/roasters`} className="text-sm text-ink-700 underline-offset-2 hover:underline">
          ← {t('common:buttons.back')}
        </Link>
      </p>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">{roaster.roaster_name}</h1>
          <p className="mt-1 text-sm capitalize text-ink-900/60">
            {roaster.segment} · {roaster.status}
          </p>
        </div>
        <ChurnTierBadge score={roaster.churn_risk_score} />
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dashboard:metrics.ltv')}
          value={roaster.ltv_cents != null ? fmtCurrency(roaster.ltv_cents, i18n.language) : '—'}
        />
        <StatCard
          label={t('dashboard:metrics.cac')}
          value={roaster.cac_cents != null ? fmtCurrency(roaster.cac_cents, i18n.language) : '—'}
        />
        <StatCard
          label={t('dashboard:metrics.paybackPeriod')}
          value={roaster.payback_months != null ? `${fmtNumber(roaster.payback_months, i18n.language)} mo` : '—'}
        />
        <StatCard
          label={t('dashboard:metrics.churnRisk')}
          value={roaster.churn_risk_score != null ? roaster.churn_risk_score.toFixed(2) : '—'}
          hint="hazard line 0.70"
        />
      </div>

      <section aria-label="Interventions">
        <h2 className="mb-3 font-display text-xl font-semibold text-ink-900">Interventions</h2>

        <form
          className="card mb-5 flex flex-wrap items-end gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
              Type
            </span>
            <select className="input w-48" value={type} onChange={(e) => setType(e.target.value)}>
              {INTERVENTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
              Note
            </span>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cupping follow-up, pricing call…"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? t('common:states.loading') : t('common:buttons.save')}
          </button>
          {formError ? (
            <p className="w-full rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
        </form>

        {interventions.length === 0 ? (
          <p className="text-sm text-ink-900/60">{t('common:states.empty')}</p>
        ) : (
          <ol className="relative ml-3 space-y-4 border-l border-parchment-200">
            {interventions.map((intervention, idx) => (
              <li key={intervention.id ?? idx} className="relative pl-6">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brass-500" aria-hidden />
                <p className="text-sm font-medium capitalize text-ink-900">
                  {intervention.intervention_type.replace(/_/g, ' ')}
                  {intervention.outcome ? (
                    <span className="ml-2 font-normal text-ink-900/60">→ {intervention.outcome}</span>
                  ) : null}
                </p>
                {intervention.note ? <p className="text-sm text-ink-900/70">{intervention.note}</p> : null}
                {intervention.created_at ? (
                  <p className="font-mono text-xs text-ink-900/50">
                    {fmtDateTime(intervention.created_at, i18n.language)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
