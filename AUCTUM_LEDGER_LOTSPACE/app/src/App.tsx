import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { LocaleLayout, RootRedirect } from './components/LocaleLayout'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NavigatorPage = lazy(() => import('./pages/NavigatorPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const LotDetailPage = lazy(() => import('./pages/LotDetailPage'))
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'))
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'))
const AutomationRulesPage = lazy(() => import('./pages/AutomationRulesPage'))
const RoastersPage = lazy(() => import('./pages/RoastersPage'))
const RoasterDetailPage = lazy(() => import('./pages/RoasterDetailPage'))
const SampleKitsPage = lazy(() => import('./pages/SampleKitsPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'))
const CredentialsPage = lazy(() => import('./pages/CredentialsPage'))
const TracksPage = lazy(() => import('./pages/TracksPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:locale" element={<LocaleLayout />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="navigator" element={<NavigatorPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="catalog/:lotId" element={<LotDetailPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="automation-rules" element={<AutomationRulesPage />} />
            <Route path="roasters" element={<RoastersPage />} />
            <Route path="roasters/:id" element={<RoasterDetailPage />} />
            <Route path="sample-kits" element={<SampleKitsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="webhooks" element={<WebhooksPage />} />
            <Route path="education/credentials" element={<CredentialsPage />} />
            <Route path="education/tracks" element={<TracksPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

