import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './lib/i18n'
import { useSettingsStore } from './store/settingsStore'

// Apply dark mode on initial load
const settings = useSettingsStore.getState().settings
if (settings.darkMode) {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
