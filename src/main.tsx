import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/global.css'
import './styles/ui.css'
import App from './App.tsx'

// iOS's "Add to Home Screen" snapshots whatever the service worker is
// currently serving in this Safari tab — it does not force a fresh network
// fetch — and every installed home-screen web app gets its own isolated
// Cache Storage that a plain reinstall does not clear. That means a tab left
// open on an old, stale-cached SW can get an icon installed against
// pre-update HTML (including stale <meta> tags) even after a code fix ships.
//
// registerType: 'autoUpdate' (with skipWaiting/clientsClaim forced in
// vite.config.ts) already makes the vite-plugin-pwa client reload this tab
// automatically the moment a new worker activates. The one thing it doesn't
// do on its own is *check* for updates while the tab sits idle — an A2HS'd
// app is rarely reopened often enough to hit the browser's own update-check
// cadence — so poll explicitly. Combined with a single fresh visit to this
// tab before tapping "Add to Home Screen", this guarantees Cache Storage
// holds the current build (visible as a bumped "Versione" in Diagnostica)
// before the icon is (re)installed.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
