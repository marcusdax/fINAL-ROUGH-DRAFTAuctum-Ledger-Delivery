import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SpaceCard } from '../components/spaces/SpaceCard'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { fetchSpaces } from '../api/client'
import type { Space } from '../types/api'

export default function SpacesPage() {
  const { t } = useTranslation(['common', 'spaces'])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetchSpaces()
      .then((rows) => { if (!cancelled) { setSpaces(rows); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setError(err); setStatus('error') } })
    return () => { cancelled = true }
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={() => setStatus('loading')} />

  return (
    <div>
      <PageHeader title={t('common:nav.spaces', 'Spaces')} subtitle={t('spaces:subtitle', 'Browse and manage spaces across the network.')} />
      {spaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spaces.map((s) => (
            <SpaceCard key={s.id} name={s.name} archetype={s.archetype} avatarUrl={s.shopfront?.logo_url ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}
