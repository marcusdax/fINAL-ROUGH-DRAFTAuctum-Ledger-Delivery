import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConnectionList } from '../components/connections/ConnectionList'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { fetchConnections } from '../api/client'
import type { Connection } from '../types/api'

export default function ConnectionsPage() {
  const { t } = useTranslation(['common', 'connections'])
  const [connections, setConnections] = useState<Connection[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetchConnections()
      .then((rows) => { if (!cancelled) { setConnections(rows); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setError(err); setStatus('error') } })
    return () => { cancelled = true }
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={() => setStatus('loading')} />

  return (
    <div>
      <PageHeader title={t('common:nav.connections', 'Connections')} subtitle={t('connections:subtitle', 'Manage your social graph and collector relationships.')} />
      {connections.length === 0 ? (
        <EmptyState />
      ) : (
        <ConnectionList connections={connections.map(c => ({ id: c.id, followerSpaceId: c.followerSpaceId, type: c.type }))} />
      )}
    </div>
  )
}
