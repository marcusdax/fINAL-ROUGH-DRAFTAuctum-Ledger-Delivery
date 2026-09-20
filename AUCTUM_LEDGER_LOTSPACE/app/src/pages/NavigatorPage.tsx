import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, LoadingState, PageHeader } from '../components/ui'
import { ErrorState } from '../components/ui'
import { ScaBadge } from '../components/LotCard'
import i18n from '../i18n'
import { fmtCupScore, fmtNumber, fmtPricePerLb } from '../lib/format'
import { useAppStore } from '../store/root-store'
import type { Lot } from '../types/api'

type ObjectiveKey = 'baseline' | 'costOptimized' | 'qualityFirst' | 'sustainability' | 'supplyChain'

/**
 * Origin Navigator — origin-centric explorer (list + filters; no map lib
 * per contract). Groups lots by origin with aggregate stats and ranks
 * within an origin against the chosen sourcing objective.
 */
export default function NavigatorPage() {
  const { t } = useTranslation('catalog')
  const { locale } = useParams<{ locale: string }>()
  const { lots, lotsStatus, lotsError, fetchLots } = useAppStore()
  const [objective, setObjective] = useState<ObjectiveKey>('baseline')

  useEffect(() => {
    if (lotsStatus === 'idle') void fetchLots()
  }, [lotsStatus, fetchLots])

  const byOrigin = useMemo(() => {
    const groups = new Map<string, Lot[]>()
    for (const lot of lots) {
      const group = groups.get(lot.origin) ?? []
      group.push(lot)
      groups.set(lot.origin, group)
    }
    const score = (lot: Lot): number => {
      switch (objective) {
        case 'costOptimized':
          return -lot.price_per_lb_cents
        case 'qualityFirst':
          return lot.cup_score ?? 0
        case 'sustainability':
          return lot.esg_score ?? 0
        case 'supplyChain':
          return lot.logistics_score ?? 0
        default:
          return (lot.cup_score ?? 0) + (lot.esg_score ?? 0) * 10
      }
    }
    return Array.from(groups.entries())
      .map(([origin, originLots]) => ({
        origin,
        lots: [...originLots].sort((a, b) => score(b) - score(a)),
        bestCup: Math.max(...originLots.map((l) => l.cup_score ?? 0)),
        minPrice: Math.min(...originLots.map((l) => l.price_per_lb_cents)),
        totalLbs: originLots.reduce((sum, l) => sum + l.available_quantity_lbs, 0),
      }))
      .sort((a, b) => b.bestCup - a.bestCup)
  }, [lots, objective])

  if (lotsStatus === 'loading' || lotsStatus === 'idle') {
    return <LoadingState label={t('common:states.loadingLots')} />
  }
  if (lotsStatus === 'error') {
    return <ErrorState error={lotsError} onRetry={() => void fetchLots()} />
  }

  return (
    <div>
      <PageHeader overline="SOURCE" title={t('title')} />

      <div className="card mb-5 p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
          {t('sourcingObjective')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(['baseline', 'costOptimized', 'qualityFirst', 'sustainability', 'supplyChain'] as const).map((key) => (
            <label
              key={key}
              title={t(`goals.${key}.description`)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                objective === key
                  ? 'border-green-700/40 bg-green-100 font-medium text-green-800'
                  : 'border-ink-700/20 bg-paper text-ink-900/70 hover:bg-parchment-100'
              }`}
            >
              <input
                type="radio"
                name="sourcing-objective"
                className="sr-only"
                checked={objective === key}
                onChange={() => setObjective(key)}
              />
              {t(`goals.${key}.label`)}
            </label>
          ))}
        </div>
      </div>

      {byOrigin.length === 0 ? (
        <EmptyState title={t('empty.title')} />
      ) : (
        <div className="space-y-4">
          {byOrigin.map((group) => (
            <section key={group.origin} className="card p-4" aria-label={group.origin}>
              <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold text-ink-900">{group.origin}</h2>
                <p className="font-mono text-xs text-ink-900/60">
                  {t('resultsSummary', { lotCount: group.lots.length, originCount: 1 })} ·{' '}
                  {fmtNumber(group.totalLbs, i18n.language)} {t('common:units.lbs')} ·{' '}
                  {t('filters.sort.price')} ≥ {fmtPricePerLb(group.minPrice, i18n.language)} · SCA ≤{' '}
                  {fmtCupScore(group.bestCup, i18n.language)}
                </p>
              </header>
              <ul className="divide-y divide-parchment-200/70">
                {group.lots.map((lot) => (
                  <li key={lot.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Link
                      to={`/${locale}/catalog/${lot.id}`}
                      className="min-w-0 flex-1 font-medium text-ink-900 hover:underline"
                    >
                      {lot.region ? `${lot.region} · ` : ''}
                      {lot.varietal ?? ''}
                      <span className="ml-2 font-normal text-ink-900/60">
                        {lot.processing_method
                          ? t(`processMethods.${lot.processing_method}`, lot.processing_method)
                          : ''}
                        {lot.elevation ? ` · ${fmtNumber(lot.elevation, i18n.language)} masl` : ''}
                      </span>
                    </Link>
                    <span className="font-mono text-sm text-ink-900">
                      {fmtPricePerLb(lot.price_per_lb_cents, i18n.language)}
                    </span>
                    {lot.cup_score != null ? <ScaBadge score={lot.cup_score} /> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
