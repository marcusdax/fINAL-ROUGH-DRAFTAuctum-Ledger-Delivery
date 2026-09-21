import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FeedItem } from '../components/feeds/FeedItem'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { fetchFeed } from '../api/client'
import type { FeedItem as FeedItemType } from '../types/api'

export default function FeedsPage() {
  const { t } = useTranslation(['common', 'feeds'])
  const [items, setItems] = useState<FeedItemType[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetchFeed()
      .then((rows) => { if (!cancelled) { setItems(rows); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setError(err); setStatus('error') } })
    return () => { cancelled = true }
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={() => setStatus('loading')} />

  return (
    <div>
      <PageHeader title={t('common:nav.feeds', 'Feeds')} subtitle={t('feeds:subtitle', 'Activity feed across the LotSpace network.')} />
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <FeedItem type={item.type} content={item.content} provenanceRef={item.provenanceRef} createdAt={item.createdAt} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
