# Money Tracker — project context

Personal finance PWA for Fabio (EUR). UI is **English by default** with Italian selectable in Settings; all user-facing strings MUST go through the typed i18n dictionaries in `src/i18n/` (`en.ts`/`it.ts` share a `TranslationKeys` type — the build fails on missing keys; never hardcode UI strings). Dates, currency formatting, keypad decimal separator and CSV format all follow the active language. **Everything published (README, code, comments, commit messages) is in English; conversation with the user is in Italian.** Live at https://brutalino.github.io/money-tracker/ — repo `Brutalino/money-tracker`, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. The app is in daily use on the owner's iPhone 16 Pro (402×874pt): treat `main` as production and verify before pushing.

## Workflow expectations

- The user wants the orchestrator model to delegate substantive execution to **Opus subagents** and review their output; only trivial edits are done directly.
- Verify changes for real before pushing: `npm run build` (must pass with zero TS errors), then exercise the built app with Playwright against `npm run preview` (port 4173) at **402×874**.
- The user tests on the installed PWA. After a deploy, the app self-updates on next launch (SW registered manually with `immediate: true` in `src/main.tsx`). For device-side layout issues, ask for a screenshot of **Impostazioni → Diagnostica** (shows version, innerHeight, safe-area insets).

## Architecture

- React 18 + TypeScript + Vite, Dexie (IndexedDB, schema v2 in `src/db/db.ts`), Recharts, vite-plugin-pwa, CSS Modules. No backend, no accounts: all data is local to the device.
- `src/lib/` is pure domain logic (money, dates, recurring, stats, budgets, backup); screens live in `src/screens/<Tab>/`.
- **All money is integer cents** (`amountCents`). Budgets are integer euros by design (`amountEuros`), suggestions rounded to nearest 5€.
- Dates are local-timezone ISO strings (`yyyy-mm-dd`), month keys `yyyy-mm`; never construct dates via `new Date(isoString)`.
- **Recurring items have no due dates by user decision**: amount + frequency only, converted to a monthly equivalent and materialized as a transaction dated the 1st of each month with deterministic id `rec-<recurringId>-<yyyy-mm>` (primary-key uniqueness makes materialization race-free; see `src/lib/recurring.ts`). Reactivating a paused item resets `createdMonth` — do not backfill paused months.
- App shell: page never scrolls; header and bottom nav are fixed flex children, only the content area scrolls. Home, Risparmi and the quick-entry sheet must fit 402×874 with zero internal scrolling.

## iOS PWA landmines (do not regress these)

- `apple-mobile-web-app-status-bar-style` must stay **`default`**: `black-translucent` makes iOS size the standalone window as screen−statusbar but anchor it at the top → ~62pt dead black band at the bottom.
- No viewport units (`dvh`) or bare percentage heights on `html/body` for the shell: `100vh` + JS-measured `--app-height` (inline probe in `index.html`) is the working combination (WebKit bug 237961).
- Keep the manual SW registration (`injectRegister: false` + `virtual:pwa-register`, `skipWaiting`/`clientsClaim` true): iOS "Add to Home Screen" snapshots whatever the SW currently serves, so stale-serving SWs make head/meta fixes unreachable on device.
- Bump `package.json` version on user-visible changes — it shows in Diagnostica and is the only reliable on-device proof of which build runs.

## Commands

```bash
npm run dev / build / preview
git push   # = production deploy via Actions; verify live bundle hash matches dist/index.html after
```
