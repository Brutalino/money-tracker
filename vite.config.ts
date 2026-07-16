import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in src/main.tsx (via `virtual:pwa-register`) so we
      // can force an immediate update check + a one-time reload the instant a
      // new service worker takes control. iOS's "Add to Home Screen" just
      // snapshots whatever this SW is currently serving in the Safari tab —
      // it does not force a fresh network fetch — and each installed web app
      // gets its own isolated Cache Storage that a plain reinstall does not
      // clear. Without this, a tab left open on an old SW can get an icon
      // installed against stale precached HTML (and stale <meta> tags).
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Money Tracker',
        short_name: 'Money',
        description: 'Track expenses, budgets and savings',
        theme_color: '#fcfcfb',
        background_color: '#fcfcfb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // vite-plugin-pwa only force-sets these two when injectRegister is
        // 'auto'/null (the default auto-injected registerSW.js). We register
        // manually above, so without this the new worker would sit in
        // "waiting" forever — the client's autoUpdate reload logic never
        // sends it a skip-waiting message, only the opt-in "prompt" flow
        // does. Keep both true so a deployed update activates and claims
        // this page immediately, same as before.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
