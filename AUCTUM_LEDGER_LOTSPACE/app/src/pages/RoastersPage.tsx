import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchRoasters } from '../api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtCurrency, fmtNumber } from '../lib/format'
import type { Roaster } from '../types/api'

/** Churn tiers (brief §1): T0 <0.30 · T1 0.30–0.55 · T2 0.55–0.70 · T3 ≥0.70. */
export function churnTier(score: number | null): 'T0' | 'T1' | 'T2' | 'T3' {
  if (score == null) return 'T0'
  if (score >= 0.7) return 'T3'
  if (score >= 0.55) return 'T2'
  if (score >= 0.3) return 'T1'
  return 'T0'
}

const TIER_STYLE: Record<string, string> = {
  T0: 'border-green-700/30 bg-green-100 text-green-800',
  T1: 'border-brass-700/30 bg-brass-100 text-brass-700',
  T2: 'border-amber-700/30 bg-amber-100 text-amber-700',
  T3: 'border-red-700/30 bg-red-100 text-red-700',
}

export function ChurnTierBadge({ score }: { score: number | null }) {
  const tier = churnTier(score)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${TIER_STYLE[tier]}`}
      title={score != null ? score.toFixed(2) : undefined}
    >
      {tier}
    </span>
  )
}

export default function RoastersPage() {
  const { t } = useTranslation(['common', 'roasters'])
  const { locale } = useParams<{ locale: string }>()
  const [roasters, setRoasters] = useState<Roaster[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchRoasters()
      .then((rows) => {
        if (cancelled) return
        setRoasters(rows)
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

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={load} />

  return (
    <div>
      <PageHeader title={t('common:nav.roasters', 'Roasters')} />
      {roasters.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{t('common:nav.roasters', 'Roasters')}</th>
                <th>Segment</th>
                <th>Churn</th>
                <th>{t('dashboard:metrics.ltv', 'LTV')}</th>
                <th>{t('dashboard:metrics.cac', 'CAC')}</th>
                <th>{t('dashboard:metrics.orders', 'Orders')}</th>
                <th>{t('dashboard:metrics.churnRisk', 'Days since order')}</th>
              </tr>
            </thead>
            <tbody>
              {roasters.map((roaster) => (
                <tr key={roaster.id}>
                  <td>
                    <Link
                      to={`/${locale}/roasters/${roaster.id}`}
                      className="font-medium text-ink-900 hover:underline"
                    >
                      {roaster.roaster_name}
                    </Link>
                    <span className="block text-xs capitalize text-ink-900/50">{roaster.status}</span>
                  </td>
                  <td className="capitalize">{roaster.segment}</td>
                  <td>
                    <ChurnTierBadge score={roaster.churn_risk_score} />
                  </td>
                  <td className="font-mono">
                    {roaster.ltv_cents != null ? fmtCurrency(roaster.ltv_cents, i18n.language) : '—'}
                  </td>
                  <td className="font-mono">
                    {roaster.cac_cents != null ? fmtCurrency(roaster.cac_cents, i18n.language) : '—'}
                  </td>
                  <td className="font-mono">
                    {roaster.total_orders != null ? fmtNumber(roaster.total_orders, i18n.language) : '—'}
                  </td>
                  <td className="font-mono">
                    {roaster.days_since_last_order != null
                      ? fmtNumber(roaster.days_since_last_order, i18n.language)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
