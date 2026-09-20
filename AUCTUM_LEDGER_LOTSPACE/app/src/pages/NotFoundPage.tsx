import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation('errors')
  const { locale } = useParams<{ locale: string }>()
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-brass-700">AL-GEN-1005</p>
      <h1 className="font-display text-3xl font-semibold text-ink-900">{t('title')}</h1>
      <p className="max-w-md text-sm text-ink-900/70">{t('codes.LOT_NOT_FOUND')}</p>
      <Link to={`/${locale ?? 'en-US'}`} className="btn-primary">
        {t('cta.retry')}
      </Link>
    </div>
  )
}
