import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { History, X } from 'lucide-react'
import { ProblemError } from '../api/http'
import CredentialBadge from '../components/CredentialBadge'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import i18n from '../i18n'
import { fmtDate, fmtDateTime } from '../lib/format'
import { useAppStore } from '../store/root-store'
import type {
  Credential,
  CredentialEventName,
  CredentialStateName,
} from '../types/api'

/**
 * Education wallet — credential cards with state badges, transition
 * actions enforcing spec §5.2, and an audit-events drawer.
 */

/** Which transitions a human operator may trigger from each state
 *  (spec §5.2: renew only from active; drift_flagged active|expiring;
 *  lapse active|expiring|stale; lapsed is terminal). */
const ALLOWED_ACTIONS: Record<CredentialStateName, CredentialEventName[]> = {
  active: ['renew', 'drift_flagged', 'lapse'],
  expiring: ['drift_flagged', 'lapse'],
  stale: ['lapse'],
  lapsed: [],
}

const ACTION_LABEL: Record<CredentialEventName, string> = {
  renew: 'Renew',
  drift_flagged: 'Flag drift',
  lapse: 'Mark lapsed',
}

const ACTION_HINT: Record<CredentialEventName, string> = {
  renew: 'Extends validity by one year. Only valid from Active.',
  drift_flagged: 'Moves the credential to Stale — earned against a superseded SOP.',
  lapse: 'Moves the credential to Lapsed. Lapsed is terminal.',
}

function actionButtonClass(event: CredentialEventName): string {
  if (event === 'renew') return 'btn-primary'
  if (event === 'lapse') return 'btn-danger'
  return 'btn-secondary'
}

function TransitionRow({
  credential,
  event,
  onDone,
  onCancel,
}: {
  credential: Credential
  event: CredentialEventName
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation(['common', 'errors'])
  const { transitionCredential } = useAppStore()
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setPending(true)
    setError(null)
    try {
      await transitionCredential(credential.id, event, reason || undefined)
      onDone()
    } catch (err) {
      if (err instanceof ProblemError && err.code === 'AL-EDU-1002') {
        setError('That transition is not allowed by the credential state machine.')
      } else {
        setError(err instanceof ProblemError ? t(err.i18nKey) : t('errors:unknown'))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brass-600/30 bg-parchment-100/60 p-3">
      <p className="mb-2 text-xs text-ink-900/70">{ACTION_HINT[event]}</p>
      <label className="mb-2 block">
        <span className="sr-only">Reason</span>
        <input
          className="input"
          placeholder={`Reason (${t('common:labels.optional').toLowerCase()})`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error ? (
        <p className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('common:buttons.cancel')}
        </button>
        <button type="button" className={actionButtonClass(event)} onClick={() => void confirm()} disabled={pending}>
          {pending ? t('common:states.loading') : t('common:buttons.confirm')}
        </button>
      </div>
    </div>
  )
}

function EventsDrawer({ credential, onClose }: { credential: Credential; onClose: () => void }) {
  const { t } = useTranslation(['common', 'errors'])
  const { eventsByCredentialId, eventsStatus, fetchCredentialEvents } = useAppStore()

  useEffect(() => {
    void fetchCredentialEvents(credential.id)
  }, [credential.id, credential.updated_at, fetchCredentialEvents])

  const events = eventsByCredentialId[credential.id] ?? []

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-ink-900/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        className="flex h-full w-full max-w-md flex-col bg-paper shadow-drawer"
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        exit={{ x: 80 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${credential.holder_name} — audit trail`}
      >
        <header className="flex items-center justify-between border-b border-parchment-200 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">{credential.credential_type}</h2>
            <p className="text-sm text-ink-900/60">{credential.holder_name}</p>
          </div>
          <button type="button" className="btn-ghost p-1" onClick={onClose} aria-label={t('common:buttons.close')}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {eventsStatus === 'loading' ? (
            <LoadingState />
          ) : events.length === 0 ? (
            <p className="text-sm text-ink-900/60">{t('common:states.empty')}</p>
          ) : (
            <ol className="relative ml-3 space-y-4 border-l border-parchment-200">
              {events.map((event) => (
                <li key={event.id} className="relative pl-6">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden />
                  <p className="text-sm font-medium text-ink-900">
                    {event.event.replace(/_/g, ' ')}
                    {event.from_state && event.to_state ? (
                      <span className="ml-2 font-mono text-xs font-normal text-ink-900/60">
                        {event.from_state} → {event.to_state}
                      </span>
                    ) : null}
                  </p>
                  {event.reason ? <p className="text-sm text-ink-900/70">{event.reason}</p> : null}
                  <p className="font-mono text-xs text-ink-900/50">
                    {event.actor ? `${event.actor} · ` : ''}
                    {fmtDateTime(event.created_at, i18n.language)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}

export default function CredentialsPage() {
  const { t } = useTranslation(['common', 'errors'])
  const {
    credentials,
    credentialsStatus,
    credentialsError,
    fetchCredentials,
    transitionPendingId,
  } = useAppStore()
  const [confirming, setConfirming] = useState<{ id: string; event: CredentialEventName } | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)

  useEffect(() => {
    if (credentialsStatus === 'idle') void fetchCredentials()
  }, [credentialsStatus, fetchCredentials])

  if (credentialsStatus === 'loading' || credentialsStatus === 'idle') return <LoadingState />
  if (credentialsStatus === 'error') {
    return <ErrorState error={credentialsError} onRetry={() => void fetchCredentials()} />
  }

  const drawerCredential = credentials.find((c) => c.id === drawerId) ?? null

  return (
    <div>
      <PageHeader
        overline="EDUCATION"
        title={t('common:nav.credentials', 'Credentials')}
        subtitle="Q-grader, SCA, and compliance credentials across the network — renewed, drift-flagged, or lapsed against the current SOP."
      />

      {credentials.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {credentials.map((credential) => {
            const actions = ALLOWED_ACTIONS[credential.state] ?? []
            return (
              <article key={credential.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold leading-snug text-ink-900">
                      {credential.credential_type}
                    </h3>
                    <p className="text-sm text-ink-900/70">
                      {credential.holder_name}
                      {credential.issuer ? ` · ${credential.issuer}` : ''}
                    </p>
                  </div>
                  <CredentialBadge state={credential.state} />
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">Issued</dt>
                    <dd>{credential.issued_at ? fmtDate(credential.issued_at, i18n.language) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-700/60">Expires</dt>
                    <dd>{credential.expires_at ? fmtDate(credential.expires_at, i18n.language) : '—'}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-parchment-200 pt-3">
                  {actions.map((event) => (
                    <button
                      key={event}
                      type="button"
                      className={`${actionButtonClass(event)} px-2.5 py-1.5 text-xs`}
                      disabled={transitionPendingId === credential.id}
                      onClick={() => setConfirming({ id: credential.id, event })}
                    >
                      {ACTION_LABEL[event]}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost ml-auto px-2.5 py-1.5 text-xs"
                    onClick={() => setDrawerId(credential.id)}
                    aria-label={`${credential.holder_name} audit trail`}
                  >
                    <History className="h-3.5 w-3.5" aria-hidden />
                    Events
                  </button>
                </div>

                <AnimatePresence>
                  {confirming?.id === credential.id ? (
                    <TransitionRow
                      credential={credential}
                      event={confirming.event}
                      onDone={() => setConfirming(null)}
                      onCancel={() => setConfirming(null)}
                    />
                  ) : null}
                </AnimatePresence>
              </article>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {drawerCredential ? (
          <EventsDrawer credential={drawerCredential} onClose={() => setDrawerId(null)} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
