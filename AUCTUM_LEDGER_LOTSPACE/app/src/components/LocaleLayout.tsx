import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { detectLocale, isSupportedLocale, persistLocale, type SupportedLocale } from '../i18n'
import { LoadingState } from '../components/ui'

/** `/` never 404s — redirect to the best detected locale. */
export function RootRedirect() {
  return <Navigate to={`/${detectLocale()}`} replace />
}

/**
 * Locale-prefixed route shell (`/{locale}/...`). The route param is
 * authoritative: it drives i18n.changeLanguage and persists the choice.
 * Invalid locales redirect to the detected best locale, preserving the
 * remaining path.
 */
export function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>()
  const location = useLocation()
  const { i18n } = useTranslation()
  const valid = isSupportedLocale(locale)

  useEffect(() => {
    if (valid && i18n.language !== locale) {
      void i18n.changeLanguage(locale)
    }
    if (valid) {
      persistLocale(locale as SupportedLocale)
      document.documentElement.lang = locale
    }
  }, [valid, locale, i18n])

  if (!valid) {
    const rest = location.pathname.replace(/^\/[^/]+/, '')
    const search = location.search ?? ''
    return <Navigate to={`/${detectLocale()}${rest}${search}`} replace />
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <Outlet />
    </Suspense>
  )
}
