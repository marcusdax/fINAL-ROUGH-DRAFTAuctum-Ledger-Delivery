import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BarChart3,
  Bookmark,
  Compass,
  GraduationCap,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react'
import { SUPPORTED_LOCALES, persistLocale, type SupportedLocale } from '../i18n'
import { ChatWidget } from './ChatWidget'

interface NavItem {
  to: string
  labelKey: string
  icon: typeof Compass
}

interface NavGroup {
  key: string
  items: NavItem[]
}

/** Sidebar groups exactly per brief §6, plus the new EDUCATION group. */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'SOURCE',
    items: [
      { to: 'navigator', labelKey: 'nav.navigator', icon: Compass },
      { to: 'catalog', labelKey: 'nav.catalog', icon: Layers },
      { to: 'reservations', labelKey: 'nav.reservations', icon: Bookmark },
    ],
  },
  {
    key: 'ENGAGE',
    items: [
      { to: 'campaigns', labelKey: 'nav.campaigns', icon: Sparkles },
      { to: 'automation-rules', labelKey: 'nav.automationRules', icon: Workflow },
    ],
  },
  {
    key: 'RELATIONSHIPS',
    items: [
      { to: 'roasters', labelKey: 'nav.roasters', icon: Users },
      { to: 'sample-kits', labelKey: 'nav.sampleKits', icon: Package },
      { to: 'orders', labelKey: 'nav.orders', icon: ShoppingBag },
    ],
  },
  {
    key: 'INTELLIGENCE',
    items: [
      { to: 'analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: 'webhooks', labelKey: 'nav.webhooks', icon: Webhook },
    ],
  },
  {
    key: 'EDUCATION',
    items: [
      { to: 'education/credentials', labelKey: 'nav.credentials', icon: Award },
      { to: 'education/tracks', labelKey: 'nav.tracks', icon: GraduationCap },
    ],
  },
]

/** Group headers and education nav labels ship no locale keys; they are
 *  structural/domain terms rendered in brand voice. */
const NAV_LABEL_FALLBACKS: Record<string, string> = {
  'nav.navigator': 'Navigator',
  'nav.roasters': 'Roasters',
  'nav.credentials': 'Credentials',
  'nav.tracks': 'Tracks',
}

function LocaleSwitcher() {
  const { t, i18n } = useTranslation('common')
  const { locale } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const onChange = (next: SupportedLocale) => {
    persistLocale(next)
    void i18n.changeLanguage(next)
    const rest = location.pathname.replace(/^\/[^/]+/, '')
    navigate(`/${next}${rest}${location.search}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm text-ink-900/70">
      <span className="sr-only">{t('languageSwitcher.label')}</span>
      <select
        className="input w-auto py-1.5"
        aria-label={t('languageSwitcher.label')}
        value={locale ?? 'en-US'}
        onChange={(e) => onChange(e.target.value as SupportedLocale)}
      >
        {SUPPORTED_LOCALES.map((lng) => (
          <option key={lng} value={lng}>
            {t(`languageSwitcher.${lng}`, lng)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function AppLayout() {
  const { t } = useTranslation('common')
  const { locale } = useParams<{ locale: string }>()
  const [chatOpen, setChatOpen] = useState(false)
  const prefix = `/${locale ?? 'en-US'}`

  return (
    <div className="flex min-h-screen bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-brass-100 focus:px-4 focus:py-2"
      >
        {t('a11y.skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-ink-700 text-parchment-100">
        <div className="flex items-center gap-3 border-b border-parchment-100/10 px-5 py-4">
          <img src="/brand/al-monogram.svg" alt="" className="h-9 w-9" width={36} height={36} />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{t('appName')}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brass-200">
              {t('tagline')}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
          <NavLink
            to={prefix}
            end
            className={({ isActive }) =>
              `mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-ink-800 font-medium text-parchment-100 shadow-[inset_2px_0_0_#C9A34A]'
                  : 'text-parchment-100/70 hover:bg-ink-800/60 hover:text-parchment-100'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            {t('nav.dashboard')}
          </NavLink>

          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="mt-4">
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-200/80">
                {group.key}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={`${prefix}/${item.to}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-ink-800 font-medium text-parchment-100 shadow-[inset_2px_0_0_#C9A34A]'
                        : 'text-parchment-100/70 hover:bg-ink-800/60 hover:text-parchment-100'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {t(item.labelKey, NAV_LABEL_FALLBACKS[item.labelKey] ?? item.labelKey)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <footer className="border-t border-parchment-100/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-parchment-100/40">
          Auctum, Inc.
        </footer>
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-parchment-200 bg-paper/90 px-6 py-3 backdrop-blur">
          <LocaleSwitcher />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setChatOpen((v) => !v)}
            aria-pressed={chatOpen}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('nav.agent', 'Agent')}</span>
          </button>
        </header>

        <main id="main-content" className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>

      <ChatWidget open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
    </div>
  )
}
