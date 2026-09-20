/* oxlint-disable jsx-a11y/prefer-tag-over-role --
 * The reserve dialog uses explicit role="dialog" + aria-modal on a
 * framer-motion overlay; a native <dialog> element cannot host the
 * exit animation, and the semantics are intentionally preserved. */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { fetchLot, fetchRoasters } from '../api/client'
import { ProblemError } from '../api/http'
import { ScaBadge, bagsFromLbs } from '../components/LotCard'
import { ErrorState, LoadingState } from '../components/ui'
import i18n from '../i18n'
import { fmtCurrency, fmtDate, fmtNumber, fmtPricePerLb } from '../lib/format'
import { useAppStore } from '../store/root-store'
import type { Lot, Roaster } from '../types/api'

function AttributeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-parchment-200/70 py-2">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">{label}</dt>
      <dd className="text-right text-sm text-ink-900">{value}</dd>
    </div>
  )
}

function ReserveDialog({ lot, onClose }: { lot: Lot; onClose: () => void }) {
  const { t } = useTranslation(['catalog', 'common', 'errors'])
  const { reserveLot, reservePending } = useAppStore()
  const [roasters, setRoasters] = useState<Roaster[]>([])
  const [roasterId, setRoasterId] = useState('')
  const [bags, setBags] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetchRoasters()
      .then((rows) => {
        setRoasters(rows)
        setRoasterId((current) => current || rows[0]?.id || '')
      })
      .catch(() => setRoasters([]))
  }, [])

  const maxBags = Math.max(0, bagsFromLbs(lot.available_quantity_lbs))
  const quantityLbs = Math.round(bags * 60 * 2.20462)

  const submit = async () => {
    setError(null)
    try {
      await reserveLot(lot.id, roasterId, quantityLbs)
      setDone(true)
    } catch (err) {
      setError(err instanceof ProblemError ? t(err.i18nKey) : t('errors:unknown'))
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={t('catalog:lot.sourceThisLot')}
    >
      <motion.div
        className="w-full max-w-md rounded-xl bg-paper p-5 shadow-drawer"
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            {t('catalog:lot.sourceThisLot')}
          </h2>
          <button type="button" className="btn-ghost p-1" onClick={onClose} aria-label={t('common:buttons.close')}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800" aria-live="polite">
              {lot.origin} {lot.varietal ?? ''} — {fmtNumber(quantityLbs, i18n.language)}{' '}
              {t('common:units.lbs')}
            </p>
            <button type="button" className="btn-primary w-full" onClick={onClose}>
              {t('common:buttons.close')}
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
                {t('common:nav.roasters', 'Roaster')}
              </span>
              <select className="input" value={roasterId} onChange={(e) => setRoasterId(e.target.value)} required>
                {roasters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roaster_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700/70">
                {t('catalog:attributes.availableQuantity')} (bags × 60 kg)
              </span>
              <input
                className="input"
                type="number"
                min={1}
                max={maxBags}
                value={bags}
                onChange={(e) => setBags(Number(e.target.value))}
                required
              />
              <span className="mt-1 block text-xs text-ink-900/60">
                {fmtNumber(quantityLbs, i18n.language)} {t('common:units.lbs')} ·{' '}
                {t('catalog:lot.lbsAvailable', { count: lot.available_quantity_lbs })}
              </span>
            </label>

            <p className="text-sm text-ink-900">
              {fmtPricePerLb(lot.price_per_lb_cents, i18n.language)} —{' '}
              <span className="font-mono font-semibold">
                {fmtCurrency(quantityLbs * lot.price_per_lb_cents, i18n.language)}
              </span>
            </p>

            {error ? (
              <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t('common:buttons.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={reservePending || !roasterId}>
                {reservePending ? t('common:states.loading') : t('common:buttons.confirm')}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

/** Lot detail — full traceability panel + reserve dialog. */
export default function LotDetailPage() {
  const { t } = useTranslation('catalog')
  const { lotId, locale } = useParams<{ lotId: string; locale: string }>()
  const [lot, setLot] = useState<Lot | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)
  const [reserving, setReserving] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!lotId) return
    let cancelled = false
    fetchLot(lotId)
      .then((data) => {
        if (cancelled) return
        setLot(data)
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
  }, [lotId, reloadKey])

  const load = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') return <LoadingState label={t('common:states.loadingLots')} />
  if (status === 'error' || !lot) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-3">
        <Link to={`/${locale}/catalog`} className="text-sm text-ink-700 underline-offset-2 hover:underline">
          ← {t('common:buttons.back')}
        </Link>
      </p>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900">
              {lot.origin}
              {lot.region ? ` ${lot.region}` : ''}
            </h1>
            <p className="mt-1 text-ink-900/70">
              {[lot.varietal, lot.processing_method ? t(`processMethods.${lot.processing_method}`, lot.processing_method) : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {lot.cup_score != null ? <ScaBadge score={lot.cup_score} /> : null}
        </div>

        <dl className="mt-6">
          <AttributeRow label={t('attributes.elevation')} value={lot.elevation ? `${fmtNumber(lot.elevation, i18n.language)} masl` : '—'} />
          <AttributeRow label={t('attributes.scaCupScore')} value={lot.cup_score?.toFixed(1) ?? '—'} />
          <AttributeRow label={t('attributes.pricePerLb')} value={fmtPricePerLb(lot.price_per_lb_cents, i18n.language)} />
          <AttributeRow
            label={t('attributes.availableQuantity')}
            value={`${fmtNumber(bagsFromLbs(lot.available_quantity_lbs), i18n.language)} bags · ${t('lot.lbsAvailable', { count: lot.available_quantity_lbs })}`}
          />
          <AttributeRow
            label={t('attributes.estimatedArrival')}
            value={lot.estimated_arrival ? fmtDate(lot.estimated_arrival, i18n.language) : '—'}
          />
          <AttributeRow
            label={t('attributes.certifications')}
            value={
              lot.certifications && lot.certifications.length > 0
                ? lot.certifications.map((c) => t(`certifications.${c}`, c)).join(', ')
                : '—'
            }
          />
          <AttributeRow
            label={t('lot.flavorNotesLabel')}
            value={lot.flavorNotes && lot.flavorNotes.length > 0 ? lot.flavorNotes.join(', ') : '—'}
          />
        </dl>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-primary" onClick={() => setReserving(true)}>
            {t('lot.sourceThisLot')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {reserving ? <ReserveDialog lot={lot} onClose={() => setReserving(false)} /> : null}
      </AnimatePresence>
    </div>
  )
}
