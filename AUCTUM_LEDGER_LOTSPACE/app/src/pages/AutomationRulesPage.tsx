import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAutomationRules } from '../api/client'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import type { AutomationRule } from '../types/api'

const STATUS_STYLE: Record<string, string> = {
  armed: 'border-green-700/30 bg-green-100 text-green-800',
  paused: 'border-amber-700/30 bg-amber-100 text-amber-700',
  retired: 'border-ink-700/30 bg-ink-100 text-ink-700',
}

export default function AutomationRulesPage() {
  const { t } = useTranslation(['common', 'rules'])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAutomationRules()
      .then((rows) => {
        if (cancelled) return
        setRules(rows)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const load = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') return <LoadingState />
  if (status === 'error') return <ErrorState error={error} onRetry={load} />

  return (
    <div>
      <PageHeader title={t('common:nav.automationRules')} />
      {rules.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Trigger event</th>
                <th>Actions</th>
                <th>v</th>
                <th>{t('common:labels.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <p className="font-medium text-ink-900">{rule.rule_name}</p>
                    <p className="font-mono text-xs text-ink-900/50">{rule.rule_code}</p>
                  </td>
                  <td className="font-mono text-xs">{rule.trigger_event}</td>
                  <td>
                    <ul className="flex flex-wrap gap-1.5">
                      {rule.actions.map((action, idx) => (
                        <li
                          key={idx}
                          className="rounded-full bg-parchment-100 px-2 py-0.5 font-mono text-[11px] text-ink-900/80"
                        >
                          {action.type}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="font-mono text-xs">{rule.version}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STATUS_STYLE[rule.status] ?? 'border-ink-700/25 bg-parchment-100 text-ink-700'}`}
                    >
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
