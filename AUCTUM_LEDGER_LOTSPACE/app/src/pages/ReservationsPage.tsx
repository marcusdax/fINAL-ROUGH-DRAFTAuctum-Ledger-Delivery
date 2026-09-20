import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtDate, fmtNumber } from '../lib/format'
import { useAppStore } from '../store/root-store'

/** Reservations — lots reserved during this session (no GET endpoint exists). */
export default function ReservationsPage() {
  const { t } = useTranslation(['common', 'catalog'])
  const { locale } = useParams<{ locale: string }>()
  const { reservations, lots, lotsStatus, fetchLots } = useAppStore()

  useEffect(() => {
    if (lotsStatus === 'idle') void fetchLots()
  }, [lotsStatus, fetchLots])

  if (lotsStatus === 'loading') return <LoadingState />

  return (
    <div>
      <PageHeader title={t('common:nav.reservations')} />
      {reservations.length === 0 ? (
        <EmptyState
          title={t('common:states.empty')}
          action={
            <Link to={`/${locale}/catalog`} className="btn-primary">
              {t('catalog:title')}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{t('catalog:attributes.origin')}</th>
                <th>{t('catalog:attributes.availableQuantity')}</th>
                <th>{t('common:labels.status', 'Status')}</th>
                <th>{t('common:labels.lastUpdated')}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const lot = lots.find((l) => l.id === reservation.lot_id)
                return (
                  <tr key={reservation.id}>
                    <td className="font-medium text-ink-900">
                      {lot ? (
                        <Link to={`/${locale}/catalog/${lot.id}`} className="hover:underline">
                          {lot.origin} {lot.varietal ?? ''}
                        </Link>
                      ) : (
                        reservation.lot_id
                      )}
                    </td>
                    <td className="font-mono">{fmtNumber(reservation.quantity_lbs, i18n.language)} {t('common:units.lbs')}</td>
                    <td className="capitalize">{reservation.status}</td>
                    <td className="text-ink-900/60">{fmtDate(reservation.created_at, i18n.language)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
