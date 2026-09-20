import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Trash2, X } from 'lucide-react'
import { sendChatMessage } from '../api/client'
import { ProblemError } from '../api/http'
import type { ChatMessage } from '../types/api'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Floating AI coffee-agent panel (i18n ns `agent`).
 * Calls `${VITE_AI_PROXY_URL}/api/v1/chat` — the chat route is mounted
 * before JWT auth on the proxy with its own API-key scheme, so no token
 * handling happens here.
 */
export function ChatWidget({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useTranslation(['agent', 'errors'])
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    const content = draft.trim()
    if (!content || pending) return
    const next: ChatMessage[] = [...turns, { role: 'user', content }]
    setTurns(next as Turn[])
    setDraft('')
    setPending(true)
    setError(null)
    try {
      const reply = await sendChatMessage(next)
      setTurns([...next, { role: 'assistant', content: reply }] as Turn[])
    } catch (err) {
      setError(
        err instanceof ProblemError
          ? t(err.i18nKey)
          : t('agent:error', { message: t('errors:unknown') }),
      )
    } finally {
      setPending(false)
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
      })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? t('agent:closeChat') : t('agent:openChat')}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brass-500 text-ink-900 shadow-card transition-colors hover:bg-brass-600"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <MessageSquare className="h-5 w-5" aria-hidden />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            aria-label={t('agent:widgetTitle')}
            className="fixed bottom-20 right-5 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-xl border border-parchment-200 bg-paper shadow-drawer"
          >
            <header className="flex items-center justify-between border-b border-parchment-200 bg-ink-700 px-4 py-3">
              <h2 className="font-display text-base font-semibold text-parchment-100">
                {t('agent:widgetTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setTurns([])}
                aria-label={t('agent:clearChat')}
                className="rounded p-1 text-parchment-100/70 hover:text-parchment-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {turns.length === 0 ? (
                <p className="pt-8 text-center text-sm text-ink-900/60">{t('agent:emptyState')}</p>
              ) : (
                turns.map((turn, idx) => (
                  <div
                    key={idx}
                    className={
                      turn.role === 'user'
                        ? 'ml-8 rounded-lg bg-green-700 px-3 py-2 text-sm text-paper'
                        : 'mr-8 rounded-lg bg-parchment-100 px-3 py-2 text-sm text-ink-900'
                    }
                  >
                    {turn.content}
                  </div>
                ))
              )}
              {pending ? (
                <p className="mr-8 rounded-lg bg-parchment-100 px-3 py-2 text-sm italic text-ink-900/60" aria-live="polite">
                  {t('agent:status.streaming')}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2 border-t border-parchment-200 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <label htmlFor="agent-input" className="sr-only">
                {t('agent:placeholder')}
              </label>
              <input
                id="agent-input"
                className="input"
                placeholder={t('agent:placeholder')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={pending}
              />
              <button type="submit" className="btn-primary shrink-0 px-3" aria-label={t('agent:send')} disabled={pending}>
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  )
}
