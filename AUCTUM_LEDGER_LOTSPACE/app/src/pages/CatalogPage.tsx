import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LotCard } from '../components/LotCard'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { useAppStore } from '../store/root-store'

type SortKey = 'weighted' | 'price' | 'cup' | 'esg'

/** Catalog — filterable grid of verified lots (brief §6). */
export default function CatalogPage() {
  const { t } = useTranslation('catalog')
  const { lots, lotsStatus, lotsError, fetchLots } = useAppStore()

  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
  const [process, setProcess] = useState('')
  const [minCup, setMinCup] = useState(0)
  const [sortBy, setSortBy] = useState<SortKey>('weighted')

  useEffect(() => {
    if (lotsStatus === 'idle') void fetchLots()
  }, [lotsStatus, fetchLots])

  const origins = useMemo(
    () => Array.from(new Set(lots.map((l) => l.origin))).sort(),
    [lots],
  )
  const processes = useMemo(
    () => Array.from(new Set(lots.map((l) => l.processing_method).filter((v): v is string => !!v))).sort(),
    [lots],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = lots.filter((lot) => {
      if (origin && lot.origin !== origin) return false
      if (process && lot.processing_method !== process) return false
      if (minCup > 0 && (lot.cup_score ?? 0) < minCup) return false
      if (q) {
        const haystack = [lot.origin, lot.region, lot.varietal, ...(lot.flavorNotes ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    const by: Record<SortKey, (a: (typeof lots)[number], b: (typeof lots)[number]) => number> = {
      weighted: (a, b) => (b.cup_score ?? 0) - (a.cup_score ?? 0),
      price: (a, b) => a.price_per_lb_cents - b.price_per_lb_cents,
      cup: (a, b) => (b.cup_score ?? 0) - (a.cup_score ?? 0),
      esg: (a, b) => (b.esg_score ?? 0) - (a.esg_score ?? 0),
    }
    return result.sort(by[sortBy])
  }, [lots, search, origin, process, minCup, sortBy])

  if (lotsStatus === 'loading' || lotsStatus === 'idle') {
    return <LoadingState label={t('common:states.loadingLots')} />
  }
  if (lotsStatus === 'error') {
    return <ErrorState error={lotsError} onRetry={() => void fetchLots()} />
  }

  const originCount = new Set(filtered.map((l) => l.origin)).size

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('resultsSummary', { lotCount: filtered.length, originCount })}
      />

      <form
        className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => e.preventDefault()}
        aria-label={t('filters.searchLabel')}
      >
        <input
          className="input lg:col-span-2"
          type="search"
          aria-label={t('filters.searchLabel')}
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" aria-label={t('filters.origins')} value={origin} onChange={(e) => setOrigin(e.target.value)}>
          <option value="">{t('filters.origins')} — {t('common:labels.all')}</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select className="input" aria-label={t('filters.processing')} value={process} onChange={(e) => setProcess(e.target.value)}>
          <option value="">{t('filters.processing')} — {t('common:labels.all')}</option>
          {processes.map((p) => (
            <option key={p} value={p}>
              {t(`processMethods.${p}`, p)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            className="input"
            aria-label={t('filters.minCupScore')}
            value={minCup}
            onChange={(e) => setMinCup(Number(e.target.value))}
          >
            <option value={0}>{t('filters.minCupScore')}</option>
            {[84, 85, 86, 87, 88].map((v) => (
              <option key={v} value={v}>
                ≥ {v.toFixed(1)}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label={t('filters.sortBy')}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            {(['weighted', 'price', 'cup', 'esg'] as const).map((key) => (
              <option key={key} value={key}>
                {t(`filters.sort.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('empty.title')}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearch('')
                setOrigin('')
                setProcess('')
                setMinCup(0)
              }}
            >
              {t('empty.cta')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  )
}
