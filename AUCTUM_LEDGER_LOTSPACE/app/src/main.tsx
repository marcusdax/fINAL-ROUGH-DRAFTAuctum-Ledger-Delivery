import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'
import { LoadingState } from './components/ui'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <Suspense fallback={<LoadingState />}>
      <App />
    </Suspense>
  </StrictMode>,
)
