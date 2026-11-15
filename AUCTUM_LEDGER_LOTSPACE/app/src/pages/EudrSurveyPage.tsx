import { PageHeader } from '../components/ui'

export default function EudrSurveyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="EU Deforestation Regulation (EU 2023/1115)"
        title="Field Plot Surveyor & TRACES Gateway"
        subtitle="Offline-first plot geolocation, boundary perimeter tracing, and one-click TRACES-NT submission."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-300">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <span>Offline PWA Ready: Install on Android or iOS devices for field usage without cellular signal.</span>
        </div>
        <a
          href="/eudr-survey/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
        >
          Launch Fullscreen Field Surveyor ↗
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <iframe
          src="/eudr-survey/index.html"
          title="EUDR Plot Surveyor"
          className="h-[780px] w-full border-0"
        />
      </div>
    </div>
  )
}
