import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui'
import {
  CacByChannelWidget,
  CampaignLiftWidget,
  HazardHeatmapWidget,
  KFactorWidget,
  KitFunnelWidget,
  WtrWidget,
} from '../components/growth/widgets'

/** Growth dashboard — six recharts widgets (brief §6, i18n ns `growth`). */
export default function DashboardPage() {
  const { t } = useTranslation('growth')
  return (
    <div>
      <PageHeader overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <WtrWidget />
        <KitFunnelWidget />
        <CacByChannelWidget />
        <HazardHeatmapWidget />
        <KFactorWidget />
        <CampaignLiftWidget />
      </div>
    </div>
  )
}
