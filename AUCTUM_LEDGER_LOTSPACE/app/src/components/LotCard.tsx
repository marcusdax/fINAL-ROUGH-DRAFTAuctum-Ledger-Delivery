import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Lot } from '../types/api'
import { fmtCupScore, fmtElevation, fmtNumber, fmtPricePerLb } from '../lib/format'
import i18n from '../i18n'

const KG_PER_BAG = 60
const LB_PER_KG = 2.20462

export function bagsFromLbs(lbs: number): number {
  return Math.round(lbs / (KG_PER_BAG * LB_PER_KG))
}

/** SCA cup-score badge — brass chip, one decimal max, never rounded up. */
export function ScaBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg border border-brass-600/40 bg-brass-100 px-2 py-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brass-700">SCA</span>
      <span className="font-mono text-sm font-semibold text-ink-900">
        {fmtCupScore(score, i18n.language)}
      </span>
    </span>
  )
}

/**
 * Lot card — documentary honesty: real bag counts, masl elevation,
 * process method, price/lb; no superlatives.
 */
export function LotCard({ lot }: { lot: Lot }) {
  const { t } = useTranslation('catalog')
  const { locale } = useParams<{ locale: string }>()
  const bags = bagsFromLbs(lot.available_quantity_lbs)

  return (
    <article className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-drawer">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink-900">
            <Link to={`/${locale}/catalog/${lot.id}`} className="hover:underline">
              {lot.origin}
              {lot.region ? ` ${lot.region}` : ''}
              {lot.varietal ? ` · ${lot.varietal}` : ''}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-ink-900/70">
            {[
              lot.processing_method ? t(`processMethods.${lot.processing_method}`, lot.processing_method) : null,
              lot.elevation ? fmtElevation(lot.elevation, i18n.language) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {lot.cup_score != null ? <ScaBadge score={lot.cup_score} /> : null}
      </div>

      {lot.flavorNotes && lot.flavorNotes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('lot.flavorNotesLabel')}>
          {lot.flavorNotes.slice(0, 4).map((note) => (
            <li
              key={note}
              className="rounded-full bg-parchment-100 px-2 py-0.5 text-xs text-ink-900/80"
            >
              {note}
            </li>
          ))}
          {lot.flavorNotes.length > 4 ? (
            <li className="rounded-full px-2 py-0.5 text-xs text-ink-900/50">
              {t('lot.moreFlavorNotes', { count: lot.flavorNotes.length - 4 })}
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-auto flex items-end justify-between border-t border-parchment-200 pt-3">
        <div>
          <p className="font-mono text-lg font-semibold text-ink-900">
            {fmtPricePerLb(lot.price_per_lb_cents, i18n.language)}
          </p>
          <p className="text-xs text-ink-900/60">
            {fmtNumber(bags, i18n.language)} bags ·{' '}
            {t('lot.lbsAvailable', { count: lot.available_quantity_lbs })}
          </p>
        </div>
        <Link to={`/${locale}/catalog/${lot.id}`} className="btn-secondary">
          {t('lot.sourceThisLot')}
        </Link>
      </div>
    </article>
  )
}
