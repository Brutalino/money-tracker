# Native App Plan (iOS + Android)

Written 2026-07-23 against v0.5.5 (~7,000 LOC of TS/TSX, plus ~800 lines of CSS).
This is a dormant plan: nothing here is scheduled. It exists so that the day we decide
to build the native app, we start from decisions already made instead of a blank page.

The plan is written to survive time. It pins **decisions and interfaces**, never library
versions. Anything marked "verify at execution time" must be re-checked against the
ecosystem of that day before writing code.

---

## 1. Why native, and when to trigger this plan

The PWA is the product until one of these becomes a real need:

- **Reliable notifications** (scheduled bills, salary day, budget warnings). iOS Web Push
  exists but is fragile for an installed PWA; native notifications just work.
- **Home-screen widgets** (remaining budget at a glance). Impossible as a PWA.
- **Share-sheet / file intake**, e.g. the shelved Fineco CSV reconciliation
  (see the layered design recorded in project memory; shelved by decision on 2026-07-22,
  do not build unprompted). A native app can receive files from the share sheet.
- **PSD2 / LLM integrations**, which were explicitly parked "for the future native app".
- **App Store presence**, if the app should ever be distributed to others.
- iOS PWA support regresses in a way we cannot work around (we already fight WebKit
  bug 237961 and the status-bar sizing bug).

If none of these is pressing, do not start. The PWA costs zero to keep running.

## 2. The decision: React Native with Expo

**Chosen: React Native, Expo managed workflow, EAS Build.**

Rationale:
- Fabio has used React Native before, likes how it bridges to native OS features,
  and finds it simple. Developer preference is a real input for a personal project.
- The app is React + TypeScript today; the mental model (components, hooks, context)
  transfers directly. Both i18n contexts and all domain logic are framework-portable.
- Expo (rather than bare RN) because: iOS builds in the cloud without owning a Mac
  (EAS Build), first-party modules for everything this app needs (sqlite, file system,
  sharing, document picker, notifications, crypto), and config plugins for the
  native-extension work in Phase 5 (widgets).

**The honest cost, stated plainly** (this was the earlier "harder than it should be"
concern, now quantified against the real codebase):

React Native is **not a port of the web app**. It is a rewrite of the UI and storage
layers with reuse of the domain core:

| Layer | LOC (approx.) | Fate |
|---|---|---|
| Pure domain logic (`money`, `dates`, `smartBudget`, `keypadBuffer`, `locale`, `id`, `db/types`, `i18n/types`) | ~900 | Ports unchanged |
| i18n dictionaries (`en.ts`, `it.ts`) | ~780 | Port as data; call sites are rewritten anyway |
| DB-coupled logic (`stats`, `recurring`, `period`, `seed`, `budgets`, settings accessors, backup build/validate/import) | ~750 | Logic ports; the Dexie seam becomes a storage adapter |
| UI (screens, components, app shell, all CSS) | ~4,800 + CSS | Full rewrite in RN primitives |
| Web-only infrastructure (service worker, `--app-height` probe, PWA manifest, apple meta tags, Diagnostica viewport probes, Blob/anchor downloads) | ~150 | Dropped entirely. This is the good news: every iOS PWA landmine in CLAUDE.md stops existing |

So roughly **a quarter of the authored code carries over, and it is the quarter that
matters** (all the money math, period math, smart-budget waterfall, validation).
The other three quarters are UI, and UI is exactly what an agentic rebuild handles well
when parity criteria are written down (Section 7).

**Alternatives considered and set aside:**
- **Capacitor**: wraps the existing web app in a native shell. Near-zero rewrite and it
  would ship in a weekend, but the UI stays a WebView (same WebKit engine, same class of
  quirks we fight today), and native features are bolted on rather than first-class.
  Kept as the official fallback (Section 8).
- **Flutter / native Swift+Kotlin**: rewrite of 100% including the domain core, in
  another language. No reuse, no preference match. Rejected.

## 3. The data bridge: the backup JSON is the contract

This is the single most important long-term rule in this document.

The only bridge between the PWA and the future native app is the backup file:

```
{ version: 1, exportedAt, transactions[], categories[], recurring[],
  budgets[], goals[], contributions[], settings[] }
```

(`BackupPayload` in `src/lib/backup.ts`, validated by `isValidBackup` with per-record
checks and foreign-key cross-checks, imported atomically by `importBackup`.)

**First-run flow of the native app: import a backup exported from the PWA.** No other
migration path exists, and none is needed.

Standing invariants for the PWA, effective immediately:
1. Never change the backup shape silently. Any change bumps `version` and the importer
   keeps accepting every previous version.
2. The validator stays strict (reject whole file on any bad record): the native importer
   will inherit this exact behavior.
3. New settings keys keep flowing through the `settings` table (never localStorage),
   so they ride along in backups automatically.

## 4. Architecture of the native app

### 4.1 Code sharing

Default: convert this repo to npm workspaces at execution time:

```
apps/web        (current app, moved)
apps/native     (Expo app)
packages/core   (pure lib + db/types + i18n dictionaries + backup validation)
```

`packages/core` contains everything in the "ports unchanged" rows above. The GitHub
Pages workflow needs its paths updated when `apps/web` moves.

Acceptable lighter alternative if the monorepo feels heavy on the day: copy the core
files into the new app and accept drift (reasonable if the PWA is being retired;
wrong if both apps live on).

### 4.2 Storage: SQLite behind a repository interface

Dexie/IndexedDB does not exist in RN. Replacement: **expo-sqlite** (verify at execution
time; alternatives op-sqlite, WatermelonDB, but plain sqlite is enough for 7 tables and
one user).

- Tables map 1:1 from the Dexie schema (v4 in `src/db/db.ts`): `transactions`,
  `categories`, `recurring`, `budgets`, `goals`, `contributions`, `settings`
  (key/value, values stored as JSON text).
- Recreate the useful indexes: `transactions(date)`, `transactions(categoryId)`,
  `transactions(recurringId, date)`, `budgets(month, categoryId)` unique,
  `contributions(goalId)`.
- **Preserve the race-free recurring materialization**: the deterministic primary key
  `rec-<recurringId>-<yyyy-mm>` plus `INSERT OR IGNORE` gives exactly the same
  guarantee IndexedDB primary-key uniqueness gives today. Do not redesign this.
- All DB-coupled lib modules (`stats`, `recurring`, `period`, `seed`, `budgets`,
  `language`, `theme`, `savingsPlan`, `onboarding`, `backup`) touch Dexie only through
  the single `import { db }` seam. Port them onto a small repository layer
  (`getTransactionsByMonth`, `putSetting`, ...) instead of translating Dexie calls
  one by one.
- **Live queries**: the web app uses `dexie-react-hooks`' `useLiveQuery` (via
  `src/hooks/useDb.ts`). SQLite has no built-in equivalent. Simplest correct
  replacement for a single-user app: the repository emits a change event on every
  write; a `useLiveData(queryFn, deps)` hook re-runs on those events. Do not add a
  reactive-database dependency for this.

### 4.3 UI mapping

| Web today | Native |
|---|---|
| 5-tab state switch in `App.tsx` + `BottomNav` buttons (no router) | react-navigation bottom tabs (or expo-router). Native tab bar is a feel upgrade |
| `Sheet` component (CSS overlay, two variants, no gestures) | Native bottom sheet (e.g. @gorhom/bottom-sheet; verify at execution time). Drag-to-dismiss becomes free |
| Custom `Keypad` (12 buttons over pure `keypadBuffer.ts`) | Same 12 buttons as RN Pressables; the buffer logic ports untouched |
| CSS Modules + `global.css`/`ui.css` (theme via `data-theme` attribute + CSS variables) | `StyleSheet.create` with a theme object in context. Re-author, keeping the same design tokens (colors, spacing, radii) extracted from `global.css` |
| Recharts: 3 chart files only (`DonutChart` PieChart, `IncomeExpenseChart` BarChart, `TrendChart` AreaChart) plus an already-custom SVG `Ring` | Preferred: hand-roll all three on react-native-svg (they are simple, and `Ring` proves the pattern). Alternative: victory-native if it is healthy that day |
| `alert()` / `confirm()` in Settings (import/delete flows) | `Alert.alert` with callbacks; the synchronous `confirm()` pattern must become async |
| Blob + anchor download (backup/CSV export), `<input type="file">` (import) | expo-file-system + expo-sharing (export via share sheet), expo-document-picker (import) |
| Safe-area CSS `env()`, `--app-height` probe | react-native-safe-area-context, `useWindowDimensions`. The WebKit workarounds die here |
| `__APP_VERSION__` via Vite define | expo-constants / app config version. Keep the Diagnostica idea: a screen proving which build runs |
| Service worker + manifest + apple meta tags | Nothing. Native apps do not need them |

### 4.4 Runtime portability notes (small but real)

- `crypto.randomUUID()` in `lib/id.ts`: needs expo-crypto (or the `react-native-get-random-values` polyfill). The existing fallback already guards, but do it properly.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` (used by `money.ts`, `dates.ts`,
  `locale.ts`): Hermes Intl coverage must be smoke-tested for `it-IT`/`en-GB` in
  Phase 1, before any UI exists. Test exactly: `formatCents`, `monthLabel`,
  `decimalSeparator`.
- `theme.ts` splits: the Dexie read/write ports; `applyThemeToDocument` is replaced by
  RN `useColorScheme` + theme context.
- `document.documentElement.lang` in `i18n/context.tsx` is dropped; the rest of both
  contexts (`i18n`, `period`, including the module-level mirror pattern into
  `lib/locale.ts` / `lib/period.ts`) ports as-is. Keep that mirror pattern: it is what
  lets pure functions format correctly without React.
- `lib/diagnostics.ts` is web-only; write a native Diagnostica (app version, device,
  OS, DB row counts) because "which build is running" stays the number one debugging
  question.

## 5. Product invariants (unchanged in native)

- All money in integer cents; budgets integer euros; suggestions rounded to 5.
- Dates are local-timezone ISO strings `yyyy-mm-dd`, month keys `yyyy-mm`; never
  construct dates via `new Date(isoString)`.
- Recurring items: amount + frequency only, no due dates; materialized on the 1st of
  the calendar month regardless of the configurable period start day.
- Period keys stay `yyyy-mm` meaning "period starting in that month".
- English default, Italian selectable; every string through typed dictionaries
  (port the `TranslationKeys` mechanism verbatim; it is the compile-time safety net).
- User-facing copy: say "month", never "period"; no em dashes.
- Local-only data, no backend, no accounts. This survives until PSD2/LLM features are
  deliberately chosen, which is a separate decision with its own privacy trade-off.

## 6. Phases

### Phase 0: standing invariants in the PWA (active now, forever)

No scheduled work; just rules that keep this plan cheap:
1. Backup-format discipline (Section 3).
2. New domain logic goes into `src/lib`, pure or Dexie-coupled only through the
   `import { db }` seam. No DOM APIs in `src/lib` outside `diagnostics.ts` and the
   `downloadFile` half of `backup.ts`.
3. i18n stays typed TS dictionaries; settings stay in the Dexie `settings` table.
4. `db.ts` keeps its commented version history: it is the spec for the SQLite schema.

### Phase 1: skeleton

Expo app, TypeScript, workspaces set up, core package extracted and imported,
tab navigation with 5 empty screens, i18n + period + theme contexts running,
Intl smoke test (Section 4.4) passing on a real iPhone dev build.

**Gate: `formatCents(123456)` and `monthLabel` render correctly in both languages on device.**

### Phase 2: data layer

SQLite schema + repository + change events; DB-coupled lib ported; backup import
(read a real PWA export through the ported `isValidBackup` + repository `importBackup`);
seeding for fresh installs; recurring materialization on app foreground.

**Gate: import a real backup from the production PWA, then per-month income, expenses,
savings and budget status match the PWA to the cent for every month of history.**
This gate is the whole point of the phase; automate it as a comparison script if possible.

### Phase 3: screens, in order of daily use

1. QuickEntry sheet + keypad (the feature used every day; get entry friction right first)
2. Home (dashboard, pace, ring)
3. Spese (list, filters, recurring management)
4. Risparmi (goals, contributions)
5. Budget (including SmartBudgetSheet, the single largest UI file at ~420 lines;
   `smartBudget.ts` math is already ported so this is UI only)
6. Report (the 3 charts, last because charts are the riskiest UI bet)
7. Settings (theme, language, period start, categories, export/import, delete-all,
   native Diagnostica) + Guide + Welcome flow

**Gate per screen: side-by-side parity with the PWA on the same imported dataset.**

### Phase 4: parity audit and polish

Full checklist pass against the live PWA in both languages: every screen, CSV export
byte-compared modulo separators, backup export/import round-trip through the native
app, dark/light/auto themes, fresh-install onboarding path, iPhone screen fit.

**Gate: Fabio uses the native app in parallel with the PWA for one full month with no
mismatch. Only then does the PWA stop being primary.**

### Phase 5: the native payoff (the reason we came)

Now the features impossible in the PWA, prioritized on that day:
- Scheduled-bill / salary-day notifications (expo-notifications, all local, no server).
- **Quick-entry widget (iOS)**. Design note, because iOS constrains this hard:
  WidgetKit widgets have no text fields and no keyboard; interactivity is limited to
  Button/Toggle controls backed by App Intents (stateless background actions,
  iOS 17+, still true as of iOS 26). The widget can never host the keypad, so the
  design that actually saves time is:
  1. Category buttons on the widget, each deep-linking straight into the QuickEntry
     sheet with that category preselected and the keypad ready. One tap from the
     home screen to typing digits.
  2. Optional fixed-price buttons for habitual purchases (the usual coffee): the
     App Intent writes the transaction in the background without opening the app.
  3. The same App Intent exposed to Shortcuts/Siri and mapped to the iPhone's
     Action Button: press it anywhere, land on the keypad. Cheapest big win,
     no widget required.
  App and widget share data via an App Group container (shared SQLite file or a
  snapshot JSON); after every in-app write, ask WidgetKit to reload timelines
  (the system throttles overly frequent reloads, batch them).
- Display widget: remaining budget for the month. Read-only companion, refreshed on
  a system timeline plus explicit reload on writes. Widgets are a native SwiftUI
  extension target (added to the Expo project via config plugin); this is the
  hardest build item in this phase.
- Share-sheet CSV intake, feeding the shelved bank-reconciliation design **only if
  Fabio reopens that decision**.
- Optional: Face ID lock.

### Phase 6: distribution

- **iOS**: an Apple Developer Program membership (99 USD/year) is effectively required
  for daily personal use: without it, dev builds expire after 7 days. With it:
  EAS Build in the cloud (no Mac needed), install via TestFlight. App Store publication
  is optional and a separate decision.
- **Android**: build an APK with EAS, sideload for free. Play Store optional
  (one-time 25 USD) and only relevant if distributing to others.

## 7. Effort estimate (honest)

With Claude Code executing and this plan as the spec: Phases 1 and 2 are a few focused
sessions each; Phase 3 is the bulk, roughly one session per screen with the QuickEntry
and Budget screens the heaviest; Phases 4 to 6 a few more. Realistically **several weeks
of evening-paced sessions end to end, not a weekend**. The Capacitor fallback would be
1 or 2 sessions total, at the price of forfeiting most of Phase 5.

## 8. Checkpoint and fallback

After Phase 2 there is a formal checkpoint: the data layer works and the real effort of
Phase 3 is now visible. If the cost no longer feels worth it, **fall back to Capacitor**
wrapping the existing web app. Nothing done so far is wasted: the core package, the
backup contract and the SQLite schema knowledge all remain useful, and Phase 5 features
can partially be reached from Capacitor plugins (notifications yes, widgets no).

## 9. Verify-at-execution-time checklist

Do not trust any of these names/choices without re-checking on the day:
- [ ] Current Expo SDK and whether the managed workflow still fits
- [ ] Hermes Intl coverage for it-IT/en-GB (the Phase 1 gate)
- [ ] expo-sqlite still the sane default (vs op-sqlite etc.)
- [ ] Bottom-sheet library health (@gorhom/bottom-sheet or successor)
- [ ] Chart decision: hand-rolled react-native-svg vs victory-native health
- [ ] expo-router vs react-navigation as the tabs default
- [ ] EAS Build pricing/free tier for a personal app
- [ ] Apple Developer Program price and the 7-day dev-build limit still current
- [ ] Whether React itself has moved (React 19+, RN new-architecture status)
- [ ] Re-read project memory for decisions made after 2026-07-23 that touch this plan
