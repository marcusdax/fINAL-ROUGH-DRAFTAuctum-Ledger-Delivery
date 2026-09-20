import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { WidgetCard } from './WidgetCard'
import {
  CAC_BY_CHANNEL,
  CAC_HARD_CAP,
  CAMPAIGN_LIFT,
  HAZARD_GRID,
  HAZARD_SEGMENTS,
  HAZARD_TIERS,
  K_FACTOR_SERIES,
  K_FACTOR_TARGET,
  KIT_FUNNEL,
  WTR_SERIES,
} from '../../data/growth'
import { fmtCurrency, fmtNumber, fmtPercent } from '../../lib/format'
import i18n from '../../i18n'

const GREEN = '#2F6B4A'
const BRASS = '#C9A34A'
const AMBER = '#A8721F'
const INK = '#16323E'
const RED_700 = '#B91C1C'

const TIER_COLOR: Record<(typeof HAZARD_TIERS)[number], string> = {
  T0: GREEN,
  T1: BRASS,
  T2: AMBER,
  T3: RED_700,
}

const AXIS_TICK = { fontSize: 11, fill: '#26201A', fontFamily: 'JetBrains Mono, monospace' }

/** Weekly Transacting Roasters — trailing 7-day actives + 4-week MA. */
export function WtrWidget() {
  const { t } = useTranslation('growth')
  const latest = WTR_SERIES[WTR_SERIES.length - 1]
  return (
    <WidgetCard title={t('wtr.title')} description={t('wtr.description')}>
      <p className="mb-2 font-mono text-2xl font-semibold text-ink-900">
        {fmtNumber(latest.wtr, i18n.language)}
        <span className="ml-2 text-sm font-normal text-ink-900/60">
          4-wk MA {fmtNumber(latest.ma4, i18n.language)}
        </span>
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={WTR_SERIES} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#EDE4D3" vertical={false} />
          <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="wtr" stroke={GREEN} fill={GREEN} fillOpacity={0.18} strokeWidth={2} />
          <Line type="monotone" dataKey="ma4" stroke={BRASS} strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}

/** Kit Funnel — Kit Sent → Delivered → Feedback → First Order. */
export function KitFunnelWidget() {
  const { t } = useTranslation('growth')
  const base = KIT_FUNNEL[0].count
  const stageLabels: Record<string, string> = {
    sent: 'Kit Sent',
    delivered: 'Delivered',
    feedback: 'Feedback',
    firstOrder: 'First Order',
  }
  return (
    <WidgetCard title={t('kitFunnel.title')} description={t('kitFunnel.description')}>
      <ul className="flex flex-col gap-2">
        {KIT_FUNNEL.map((stage) => (
          <li key={stage.stage} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-900/70">
              {stageLabels[stage.stage]}
            </span>
            <div className="h-5 flex-1 rounded bg-parchment-200">
              <div
                className="h-5 rounded bg-green-600"
                style={{ width: `${(stage.count / base) * 100}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right font-mono text-xs text-ink-900">
              {fmtNumber(stage.count, i18n.language)} · {fmtPercent(stage.count / base, i18n.language)}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

/** CAC by Channel — blended CAC vs. the $500 hard cap. */
export function CacByChannelWidget() {
  const { t } = useTranslation('growth')
  return (
    <WidgetCard title={t('cacByChannel.title')} description={t('cacByChannel.description')}>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={CAC_BY_CHANNEL} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#EDE4D3" horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[0, 550]} />
          <YAxis type="category" dataKey="channel" width={110} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => fmtCurrency(Number(value) * 100, i18n.language)} />
          <ReferenceLine x={CAC_HARD_CAP} stroke={RED_700} strokeDasharray="4 3" />
          <Bar dataKey="cac" radius={[0, 3, 3, 0]}>
            {CAC_BY_CHANNEL.map((row) => (
              <Cell key={row.channel} fill={row.cac >= CAC_HARD_CAP ? RED_700 : row.channel === 'Blended' ? INK : GREEN} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}

/** Churn Hazard Heatmap — accounts by churn tier (T0–T3) × segment. */
export function HazardHeatmapWidget() {
  const { t } = useTranslation('growth')
  const max = Math.max(...HAZARD_SEGMENTS.flatMap((s) => HAZARD_TIERS.map((tier) => HAZARD_GRID[s][tier])))
  return (
    <WidgetCard title={t('hazardHeatmap.title')} description={t('hazardHeatmap.description')}>
      <table className="w-full border-separate border-spacing-1" aria-label={t('hazardHeatmap.title')}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">segment</span>
            </th>
            {HAZARD_TIERS.map((tier) => (
              <th key={tier} scope="col" className="text-center font-mono text-[11px] font-normal text-ink-900/60">
                {tier}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HAZARD_SEGMENTS.map((segment) => (
            <tr key={segment}>
              <th scope="row" className="self-center text-left font-mono text-[11px] font-normal capitalize text-ink-900/70">
                {segment}
              </th>
              {HAZARD_TIERS.map((tier) => {
                const count = HAZARD_GRID[segment][tier]
                const intensity = 0.15 + 0.85 * (count / max)
                return (
                  <td
                    key={tier}
                    aria-label={`${segment} ${tier}: ${count}`}
                    className="rounded px-1 py-2 text-center font-mono text-xs"
                    style={{ backgroundColor: TIER_COLOR[tier], opacity: intensity, color: '#FBFAF6' }}
                  >
                    {count}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetCard>
  )
}

/** K-Factor — viral referral coefficient vs. the 0.6 target. */
export function KFactorWidget() {
  const { t } = useTranslation('growth')
  const latest = K_FACTOR_SERIES[K_FACTOR_SERIES.length - 1].k
  return (
    <WidgetCard title={t('kFactor.title')} description={t('kFactor.description')}>
      <p className="mb-2 font-mono text-2xl font-semibold text-ink-900">
        {latest.toFixed(2)}
        <span className="ml-2 text-sm font-normal text-ink-900/60">target {K_FACTOR_TARGET.toFixed(1)}</span>
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={K_FACTOR_SERIES} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#EDE4D3" vertical={false} />
          <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[0, 0.7]} />
          <Tooltip />
          <ReferenceLine y={K_FACTOR_TARGET} stroke={BRASS} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="k" stroke={INK} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}

/** Campaign Lift — Bayesian posterior probability vs. control, ALT-001–005. */
export function CampaignLiftWidget() {
  const { t } = useTranslation('growth')
  return (
    <WidgetCard title={t('campaignLift.title')} description={t('campaignLift.description')}>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={CAMPAIGN_LIFT} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#EDE4D3" vertical={false} />
          <XAxis dataKey="campaign" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(v) => `${v}`} />
          <Tooltip formatter={(value) => fmtPercent(Number(value), i18n.language)} />
          <ReferenceLine y={0.5} stroke={AMBER} strokeDasharray="4 3" />
          <Bar dataKey="posterior" radius={[3, 3, 0, 0]}>
            {CAMPAIGN_LIFT.map((row) => (
              <Cell key={row.campaign} fill={row.posterior >= 0.8 ? GREEN : BRASS} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}
