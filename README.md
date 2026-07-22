# 💰 Money Tracker

A personal finance PWA for tracking expenses, budgets and savings goals. Installable on your phone and built for fast daily use: logging an expense takes less than 5 seconds.

**Live app:** https://brutalino.github.io/money-tracker/

## Features

- **Expenses** — quick entry with a custom numeric keypad and emoji categories; monthly history with search and filters
- **Fixed costs** — bills, subscriptions and installments with no due dates: each item is just an amount and a frequency (monthly/bimonthly/quarterly/annual), converted to a monthly equivalent and booked automatically on the 1st of each month
- **Monthly budget** — integer budgets per category, progress bars with 80%/100% thresholds, automatic suggestions based on your previous months (rounded to the nearest €5), month-over-month comparison
- **Savings** — multiple goals with targets and deadlines, contributions, projected completion dates
- **Reports** — spending by category, income vs expenses (6 months), per-category trends, savings rate
- **Configurable counting period** — periods default to running from the 1st of the month, but you can pick any start day (e.g. payday); Home, budgets, stats and savings all follow it
- **In-app guide** — a full walkthrough of every screen, reachable from Settings, plus a one-time welcome sheet on first launch offering to open it
- **Your data stays yours** — everything lives locally on your device (IndexedDB), no accounts, no server; JSON export/import and CSV export

English by default, Italian available in Settings → Language. EUR currency, light/dark/auto theme.

## Install on your phone (iOS)

1. Open the URL in **Safari**
2. Share → **Add to Home Screen**
3. The app works offline and self-updates on the next launch after a deploy

> Your data lives inside the installed app's container: removing the icon deletes it. Back up first via **Settings → Export JSON** before removing the app or switching phones.

## Stack

React 18 + TypeScript + Vite · Dexie (IndexedDB) · Recharts · vite-plugin-pwa · CSS Modules

All amounts are handled as **integer cents**; transactions generated from fixed costs use deterministic ids (`rec-<recurringId>-<yyyy-mm>`) so materialization is idempotent even across concurrent devices. UI strings live in typed dictionaries (`src/i18n/`) — the build fails if a translation key is missing.

```
src/
  db/          Dexie schema (v2) and types
  i18n/        typed translation dictionaries (en, it) + context/hook
  lib/         pure domain logic: money, dates, recurring, stats, budgets, backup
  components/  reusable UI (AppShell, BottomNav, QuickEntry, charts, ...)
  screens/     one folder per tab: Home, Expenses, Budget, Savings, Report, Settings
```

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc + vite build
npm run preview   # serve the production bundle on :4173
```

**Deploy:** push to `main` → GitHub Actions builds and publishes to GitHub Pages automatically.

## iOS notes (learned the hard way)

- `apple-mobile-web-app-status-bar-style` must stay **`default`**: with `black-translucent`, iOS sizes the standalone window as screen−statusbar but anchors it at the top, leaving a ~62pt dead band at the bottom
- No bare `100dvh`/percentage heights on `html/body`: the app uses `100vh` plus a JS-measured `--app-height` variable set in `index.html` (WebKit bug #237961 and friends)
- iOS "Add to Home Screen" **snapshots whatever HTML the service worker is serving** — that's why the SW is registered manually with `immediate: true` (see `src/main.tsx`), so updates activate right away
- For layout issues on a device: **Settings → Diagnostics** inside the app shows the real version, viewport and safe-area values
