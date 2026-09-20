import type { ReactNode } from 'react'

export function WidgetCard(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <header>
        <h2 className="font-display text-lg font-semibold text-ink-900">{props.title}</h2>
        {props.description ? <p className="text-xs text-ink-900/60">{props.description}</p> : null}
      </header>
      <div className="min-h-[11rem] flex-1">{props.children}</div>
    </section>
  )
}
