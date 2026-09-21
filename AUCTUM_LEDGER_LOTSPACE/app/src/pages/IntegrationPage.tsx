import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { fetchIntegrationStatus } from '../api/client'
import type { IntegrationStatus } from '../types/api'

export default function IntegrationPage() {
  const { t } = useTranslation(['common', 'integration'])
  const [statusData, setStatusData] = useState<IntegrationStatus | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetchIntegrationStatus()
      .then((data) => { if (!cancelled) { setStatusData(data); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setError(err); setStatus('error') } })
    return () => { cancelled = true }
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={() => setStatus('loading')} />

  return (
    <div>
      <PageHeader title={t('common:nav.integration', 'Integration')} subtitle={t('integration:subtitle', 'One Ledger enforcement and cross-ledger reconciliation status.')} />
      {statusData ? (
        <div className="card p-6">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">{t('integration:statusLedger', 'Ledger Status')}</dt>
              <dd className="text-sm font-medium text-ink-900">{statusData.ledger_status}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">{t('integration:outboxDepth', 'Outbox Depth')}</dt>
              <dd className="text-sm font-medium text-ink-900">{statusData.outbox_depth}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">{t('integration:schemaVersion', 'Schema Version')}</dt>
              <dd className="text-sm font-medium text-ink-900">{statusData.schema_version}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">{t('integration:consumerGroup', 'Consumer Group')}</dt>
              <dd className="text-sm font-medium text-ink-900">{statusData.consumer_group}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
