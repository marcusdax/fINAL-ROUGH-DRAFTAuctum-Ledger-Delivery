import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCampaigns } from '../api/client'
import { ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtDate } from '../lib/format'
import type { Campaign } from '../types/api'

/**
 * Campaigns — the ALT-001–005 nurture sequence as a day-offset timeline
 * (day 0/3/7/12/21), fed by GET /campaigns; step copy comes from the
 * campaigns i18n namespace (steps.alt001–005) so merge-tag email copy
 * stays byte-identical across locales.
 */
const SEQUENCE_STEPS = [
  { id: 'ALT-001', slug: 'alt-001-first-crack', day: 0, i18nKey: 'alt001' },
  { id: 'ALT-002', slug: 'alt-002-the-cupping', day: 3, i18nKey: 'alt002' },
  { id: 'ALT-003', slug: 'alt-003-the-shortlist', day: 7, i18nKey: 'alt003' },
  { id: 'ALT-004', slug: 'alt-004-second-cup', day: 12, i18nKey: 'alt004' },
  { id: 'ALT-005', slug: 'alt-005-the-regular', day: 21, i18nKey: 'alt005' },
] as const

const STATUS_STYLE: Record<string, string> = {
  active: 'border-green-700/30 bg-green-100 text-green-800',
  planned: 'border-brass-700/30 bg-brass-100 text-brass-700',
  draft: 'border-brass-700/30 bg-brass-100 text-brass-700',
  paused: 'border-amber-700/30 bg-amber-100 text-amber-700',
  completed: 'border-ink-700/30 bg-ink-100 text-ink-700',
}

export default function CampaignsPage() {
  const { t } = useTranslation(['campaigns', 'common'])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchCampaigns()
      .then((rows) => {
        if (cancelled) return
        setCampaigns(rows)
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

  const bySlug = new Map(campaigns.map((c) => [c.slug, c]))

  return (
    <div>
      <PageHeader title={t('campaigns:title')} subtitle={t('campaigns:subtitle')} />

      <section aria-label={t('campaigns:sequence.nurtureTimeline')}>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">
          {t('campaigns:sequence.nurtureTimeline')}
        </h2>
        <ol className="relative ml-3 space-y-5 border-l-2 border-parchment-200">
          {SEQUENCE_STEPS.map((step, idx) => {
            const campaign = bySlug.get(step.slug)
            return (
              <li key={step.id} className="relative pl-8">
                <span
                  className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brass-500 bg-paper"
                  aria-hidden
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brass-600" />
                </span>
                <div className="card flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="max-w-xl">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass-700">
                      {step.id} · {t(`campaigns:steps.${step.i18nKey}.timing`)} ·{' '}
                      {t('campaigns:sequence.step', { number: idx + 1 })}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-ink-900">
                      {t(`campaigns:steps.${step.i18nKey}.label`)}
                    </h3>
                    <p className="mt-1 text-sm text-ink-900/70">
                      {t(`campaigns:steps.${step.i18nKey}.objective`)}
                    </p>
                    {campaign?.description ? (
                      <p className="mt-1 text-xs italic text-ink-900/50">{campaign.description}</p>
                    ) : null}
                    {campaign ? (
                      <p className="mt-2 font-mono text-[11px] text-ink-900/50">
                        v{campaign.version} · {t('common:labels.lastUpdated')}{' '}
                        {fmtDate(campaign.updated_at, i18n.language)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                        STATUS_STYLE[campaign?.status ?? 'draft'] ?? STATUS_STYLE.draft
                      }`}
                    >
                      {t(`campaigns:status.${campaign?.status ?? 'planned'}`, campaign?.status ?? 'planned')}
                    </span>
                    <p className="max-w-[16rem] text-right font-mono text-[11px] leading-relaxed text-ink-900/50">
                      {t(`campaigns:emails.${step.i18nKey}.subject`)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
