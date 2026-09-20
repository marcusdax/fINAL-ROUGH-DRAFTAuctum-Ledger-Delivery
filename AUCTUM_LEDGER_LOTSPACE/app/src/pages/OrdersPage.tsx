import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchOrders } from '../api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtCurrency, fmtDate, fmtNumber } from '../lib/format'
import type { Order } from '../types/api'

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-700/30 bg-amber-100 text-amber-700',
  fulfilled: 'border-green-700/30 bg-green-100 text-green-800',
  delivered: 'border-green-700/30 bg-green-100 text-green-800',
  cancelled: 'border-red-700/30 bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const { t } = useTranslation(['common', 'orders'])
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchOrders()
      .then((rows) => {
        if (cancelled) return
        setOrders(rows)
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
      <PageHeader title={t('common:nav.orders')} />
      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>{t('common:nav.roasters', 'Roaster')}</th>
                <th>Line items</th>
                <th>{t('dashboard:metrics.revenue', 'Total')}</th>
                <th>{t('common:labels.status', 'Status')}</th>
                <th>{t('common:labels.lastUpdated')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="font-mono text-xs">{order.invoice_number ?? order.id.slice(0, 8)}</td>
                  <td className="font-medium text-ink-900">{order.roaster_name ?? order.account_id.slice(0, 8)}</td>
                  <td>
                    <ul className="space-y-0.5 text-xs text-ink-900/80">
                      {order.line_items.map((line, idx) => (
                        <li key={idx}>
                          {[line.origin, line.varietal].filter(Boolean).join(' ') || line.lot_id.slice(0, 8)} —{' '}
                          {fmtNumber(line.quantity_lbs, i18n.language)} {t('common:units.lbs')}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="font-mono">{fmtCurrency(order.final_total_cents, i18n.language)}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STATUS_STYLE[order.status] ?? 'border-ink-700/25 bg-parchment-100 text-ink-700'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="text-ink-900/60">{fmtDate(order.created_at, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
