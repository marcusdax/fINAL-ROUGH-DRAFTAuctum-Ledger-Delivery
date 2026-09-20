import { useTranslation } from 'react-i18next'
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, StatCard } from '../components/ui'
import i18n from '../i18n'
import { fmtPercent } from '../lib/format'

/** Engagement series for the ALT sequence window (day 0–21). */
const ENGAGEMENT_SERIES = [
  { day: 'D0', opens: 452, clicks: 181, conversions: 38 },
  { day: 'D3', opens: 418, clicks: 173, conversions: 52 },
  { day: 'D5', opens: 301, clicks: 122, conversions: 47 },
  { day: 'D7', opens: 356, clicks: 149, conversions: 61 },
  { day: 'D10', opens: 244, clicks: 96, conversions: 55 },
  { day: 'D12', opens: 389, clicks: 168, conversions: 74 },
  { day: 'D15', opens: 218, clicks: 83, conversions: 66 },
  { day: 'D18', opens: 187, clicks: 71, conversions: 63 },
  { day: 'D21', opens: 266, clicks: 118, conversions: 82 },
]

const AXIS_TICK = { fontSize: 11, fill: '#26201A', fontFamily: 'JetBrains Mono, monospace' }

/** Analytics — engagement over time + peer benchmark (i18n ns `dashboard`). */
export default function AnalyticsPage() {
  const { t } = useTranslation('dashboard')

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('metrics.totalSent')} value="1,000" />
        <StatCard label={t('metrics.openRate')} value={fmtPercent(0.452, i18n.language)} />
        <StatCard label={t('metrics.clickRate')} value={fmtPercent(0.181, i18n.language)} />
        <StatCard label={t('metrics.conversionRate')} value={fmtPercent(0.082, i18n.language)} />
      </div>

      <section className="card mb-4 p-4" aria-label={t('charts.engagementOverTime')}>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">
          {t('charts.engagementOverTime')}
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={ENGAGEMENT_SERIES} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="#EDE4D3" vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="opens" stroke="#16323E" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clicks" stroke="#C9A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="conversions" stroke="#2F6B4A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card p-4" aria-label={t('benchmark.title')}>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('benchmark.title')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label={t('benchmark.topQuartile')} value="9.6%" />
          <StatCard label={t('benchmark.median')} value="5.1%" />
          <StatCard label={t('benchmark.yourPercentile')} value="P78" />
        </div>
      </section>
    </div>
  )
}
