import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSampleKits } from '../api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtDate } from '../lib/format'
import type { SampleKit } from '../types/api'

const FUNNEL_STAGES = ['requested', 'shipped', 'delivered', 'feedback'] as const

const STAGE_STYLE: Record<string, string> = {
  requested: 'border-brass-700/30 bg-brass-100 text-brass-700',
  shipped: 'border-amber-700/30 bg-amber-100 text-amber-700',
  delivered: 'border-green-700/30 bg-green-100 text-green-800',
  feedback: 'border-ink-700/30 bg-ink-100 text-ink-700',
}

/** Sample Kits — funnel status board (requested → shipped → delivered → feedback). */
export default function SampleKitsPage() {
  const { t } = useTranslation(['common', 'sampleKits'])
  const [kits, setKits] = useState<SampleKit[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSampleKits()
      .then((rows) => {
        if (cancelled) return
        setKits(rows)
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
      <PageHeader title={t('common:nav.sampleKits')} />
      {kits.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FUNNEL_STAGES.map((stage) => {
            const stageKits = kits.filter((kit) => kit.status === stage)
            return (
              <section key={stage} className="rounded-xl bg-parchment-100/60 p-3">
                <h2 className="mb-2 flex items-center justify-between px-1">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${STAGE_STYLE[stage]}`}
                  >
                    {stage}
                  </span>
                  <span className="font-mono text-xs text-ink-900/50">{stageKits.length}</span>
                </h2>
                <ul className="space-y-2">
                  {stageKits.map((kit) => (
                    <li key={kit.id} className="card p-3">
                      <p className="text-sm font-medium text-ink-900">
                        {kit.roaster_name ?? kit.roaster_id}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-900/60">
                        {kit.lots
                          .map((lot) => [lot.origin, lot.varietal].filter(Boolean).join(' '))
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-ink-900/50">
                        {kit.tracking_number ? `${kit.carrier ?? ''} ${kit.tracking_number}`.trim() : fmtDate(kit.requested_at, i18n.language)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
