import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchTracks } from '../api/client'
import { PageHeader } from '../components/ui'
import { FALLBACK_TRACKS, MODULE_STATUS_KEY } from '../data/curriculum'
import type { CurriculumTrack } from '../types/api'

const STATUS_STYLE: Record<string, string> = {
  not_started: 'border-ink-700/20 bg-parchment-100 text-ink-700',
  in_progress: 'border-amber-700/30 bg-amber-100 text-amber-700',
  completed: 'border-green-700/30 bg-green-100 text-green-800',
  locked: 'border-ink-700/20 bg-parchment-100 text-ink-700/50',
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <progress
      value={pct}
      max={100}
      className={`h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-parchment-200 [&::-webkit-progress-value]:rounded-full ${
        pct === 100
          ? '[&::-webkit-progress-value]:bg-green-600 [&::-moz-progress-bar]:bg-green-600'
          : '[&::-webkit-progress-value]:bg-brass-500 [&::-moz-progress-bar]:bg-brass-500'
      }`}
    />
  )
}

/** Tracks — curriculum tracks with modules and progress bars (ns `curriculum`). */
export default function TracksPage() {
  const { t } = useTranslation(['curriculum', 'common'])
  const [tracks, setTracks] = useState<CurriculumTrack[]>(FALLBACK_TRACKS)

  useEffect(() => {
    // The server returns the same static curriculum; swap in when reachable
    // so server-side edits surface without a frontend release.
    let cancelled = false
    fetchTracks()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setTracks(rows)
      })
      .catch(() => {
        /* offline — local mirror already rendered */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {tracks.map((track) => {
          const totalModules = track.modules.length
          const completed = track.modules.filter((m) => m.status === 'completed').length
          const trackProgress =
            totalModules === 0 ? 0 : track.modules.reduce((sum, m) => sum + m.progress, 0) / totalModules
          return (
            <section key={track.id} className="card flex flex-col gap-4 p-5" aria-label={t(`tracks.${track.key}`)}>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-900">
                    {t(`tracks.${track.key}`)}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-900/70">{t(`trackDesc.${track.key}`)}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-900/50">
                    {track.region ? `${t('trackHeader.region')}: ${track.region} · ` : ''}
                    {track.level ?? ''}
                  </p>
                </div>
                <span className="rounded-full border border-brass-600/40 bg-brass-100 px-2.5 py-1 font-mono text-[11px] text-brass-700">
                  {t('moduleCount', { count: totalModules })}
                </span>
              </header>

              <div>
                <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ink-900/60">
                  <span>{t('trackHeader.lessonCompletion')}</span>
                  <span>
                    {completed}/{totalModules} · {Math.round(trackProgress * 100)}%
                  </span>
                </div>
                <ProgressBar value={trackProgress} />
              </div>

              <ul className="space-y-3">
                {track.modules.map((module) => (
                  <li key={module.id} className="rounded-lg border border-parchment-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{module.title}</p>
                        <p className="font-mono text-[11px] text-ink-900/50">
                          {module.lessons} lessons
                          {module.duration_minutes ? ` · ${module.duration_minutes} min` : ''}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${STATUS_STYLE[module.status]}`}
                      >
                        {t(MODULE_STATUS_KEY[module.status] ?? 'progress.notStarted')}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={module.progress} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex justify-end">
                <button type="button" className="btn-secondary" disabled={track.modules.every((m) => m.status === 'locked')}>
                  {t('viewTrack')}
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
