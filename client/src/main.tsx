import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Detect iOS standalone mode for safe-area fallback
if ((navigator as any).standalone === true) {
  document.documentElement.classList.add('standalone');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
