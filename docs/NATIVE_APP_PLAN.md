# Native App Plan (iOS in Swift, Android later)

This plan was first written 2026-07-23 against v0.5.5 (~7,000 LOC of TS/TSX, plus
~800 lines of CSS), choosing React Native with Expo. That framework decision was
superseded on 2026-08-31 (revision 2): the native app is **Swift and SwiftUI for
iOS**, not React Native. This text was updated 2026-09-04 against v0.17.0 (still
~7,000 LOC of TS/TSX). Revision 1 is preserved in git history (commit 886634f) for
the record; it must not be re-proposed.

This plan is no longer dormant. Phase 0, the MoneyCore Swift package (Section 4.1),
can start any day on any PC, Linux included. A development Mac (a MacBook Pro) has
been available since 2026-09-04, so Phase 1 is no longer gated on hardware either.

The plan is written to survive time. It pins **decisions and interfaces**, never
library versions. Anything marked "verify at execution time" must be re-checked
against the ecosystem of that day before writing code.

---

## 1. Why native, and when to trigger this plan

The PWA is the product until one of these becomes a real need:

- **Reliable notifications** (scheduled bills, salary day, budget warnings). iOS Web
  Push exists but is fragile for an installed PWA; native notifications just work.
- **Home-screen widgets** (remaining budget at a glance). Impossible as a PWA.
- **Share-sheet file intake.** The Fineco bank statement check already exists in the
  PWA since v0.16.0 (the user picks the statement file inside the app). Native adds
  receiving that file straight from the iOS share sheet, without opening the app
  first and picking a file manually.
- **PSD2 / LLM integrations**, which were explicitly parked "for the future native app".
- **App Store presence**, if the app should ever be distributed to others.
- iOS PWA support regresses in a way we cannot work around (we already fight WebKit
  bug 237961 and the status-bar sizing bug).

The decision to start was taken on 2026-08-31, driven by the native payoff (widgets,
App Intents, notifications, native feel) and by the wish to do one rewrite done
right rather than a stopgap plus a second rewrite. The PWA stays live and primary
until the Phase 3 gate.

## 2. The decision: Swift and SwiftUI

**Chosen: Swift + SwiftUI for iOS. Android later as a separate Kotlin + Jetpack
Compose project (Kotlin Multiplatform only if sharing the domain core turns out to
make sense on that day).**

Rationale:
- Fabio's conviction that native is the right move for a personal app he will use
  for years; native frameworks remain the dominant choice for polished iOS apps.
- The native payoff (WidgetKit widgets, App Intents, Action Button, local
  notifications, materials, springs, haptics) is first class in SwiftUI rather than
  reached through config plugins and bridges.
- One rewrite done right beats an RN stopgap followed by a second rewrite.
- Revision 1 chose Expo only because no Mac existed anywhere, Linux at work and at
  home. That constraint fell on 2026-08-31, when an Intel MacBook Pro 2018 was
  identified as usable, and definitively on 2026-09-04, when a MacBook Pro became
  the actual development machine.

**The honest cost, stated plainly:** this is a 100% rewrite in another language,
including the domain core.

| Layer | LOC (approx.) | Fate |
|---|---|---|
| Pure domain logic (`money`, `dates`, `smartBudget`, `keypadBuffer`, `locale`, `id`, `db/types`, `i18n/types`) | ~900 | Ported to Swift under parity tests (Section 4.1) |
| DB-coupled logic (`stats`, `recurring`, `period`, `seed`, `budgets`, settings accessors, backup build/validate/import) | ~750 | Ported to Swift under parity tests (Section 4.1) |
| i18n dictionaries (`en.ts`, `it.ts`) | ~780 | Becomes String Catalog content |
| UI (screens, components, app shell, all CSS) | ~4,800 + CSS | Full rewrite in SwiftUI (it was a full rewrite in revision 1 too) |
| Web-only infrastructure (service worker, `--app-height` probe, PWA manifest, apple meta tags, Diagnostica viewport probes, Blob/anchor downloads) | ~150 | Dropped entirely. Every iOS PWA landmine in CLAUDE.md stops existing |

Stated plainly: the extra cost versus revision 1 is porting ~1,650 LOC of
TypeScript logic to Swift. The parity tests (Section 4.1) turn that from a risk
into a mechanical task with an objective finish line: same numbers on both sides
means ported.

Swift itself is new to Fabio. The `write-swift` skill (Emil Kowalski's skills
repo) is the style reference from Phase 0 on, and the port is executed agentically.

**Alternatives considered and set aside:**
- **Expo / React Native (revision 1)**: superseded, see the rationale above.
- **Capacitor**: no longer the fallback (see Section 8). A WebView shell forfeits
  exactly the native feel that motivates this rewrite.
- **Flutter**: no preference match, no platform-native feel.
- **Kotlin Multiplatform now**: premature. Android is a later, separate project.

## 3. The data bridge: the backup JSON is the contract

This is the single most important long-term rule in this document.

The only bridge between the PWA and the native app is the backup file:

```
{ version: 1, exportedAt, transactions[], categories[], recurring[],
  budgets[], goals[], contributions[], settings[] }
```

(`BackupPayload` in `src/lib/backup.ts`, validated by `isValidBackup` with per-record
checks and foreign-key cross-checks, imported atomically by `importBackup`. Backup
`version` is 1 today; verify in `src/lib/backup.ts` at execution time.)

**First-run flow of the native app: import a backup exported from the PWA.** No other
migration path exists, and none is needed.

Standing invariants for the PWA, effective immediately:
1. Never change the backup shape silently. Any change bumps `version` and the importer
   keeps accepting every previous version.
2. The validator stays strict (reject whole file on any bad record): the native importer
   will inherit this exact behavior.
3. New settings keys keep flowing through the `settings` table (never localStorage),
   so they ride along in backups automatically.

MoneyCore (Section 4.1) defines Codable models mirroring `BackupPayload` and a
validator with the same strict per-record and foreign-key checks from day one of
Phase 0, so a production backup is readable by Swift before any UI exists.

## 4. Architecture of the native app

### 4.1 MoneyCore: the domain as a Swift package, verified by parity tests

`MoneyCore` is a Swift Package (SwiftPM), Foundation only, no UIKit/SwiftUI import,
builds and tests on **Linux** (official swift.org toolchain) and on macOS. It ports,
in this order: `money` (integer cents, formatting), `dates` (local ISO `yyyy-mm-dd`,
`yyyy-mm` month keys), `period` (configurable month start day), `stats`, `recurring`
(monthly equivalent, materialization ids `rec-<recurringId>-<yyyy-mm>`), `budgets` +
`smartBudget` (integer euros, suggestions rounded to 5), `savingsPlan`,
`keypadBuffer`, `fineco` (statement matching), and the backup model + validator. The
current modules live in `src/lib/`: `backup`, `budgets`, `categories`, `dates`,
`fineco`, `id`, `keypadBuffer`, `locale`, `money`, `period`, `recurring`,
`savingsPlan`, `seed`, `smartBudget`, `stats`. (`changelog`, `diagnostics`,
`feedback`, `language`, `onboarding`, `theme` are app-shell concerns and are not
part of MoneyCore.)

Design change on purpose: the web app uses module-level mirrors (`lib/locale.ts`,
`lib/period.ts`) so pure functions can format without React. MoneyCore does not use
globals: every function takes its `Locale` / month-start configuration explicitly.
Pure functions, no hidden state.

**Parity tests are the definition of "ported".** Shared JSON fixtures live in the
repo at `parity/fixtures/` (one file per module: inputs plus expected outputs). The
TypeScript side is the oracle: a Vitest suite in the PWA (Vitest is not installed
today, adding it is the first task of Phase 0) generates or checks the fixtures
against `src/lib`; a swift-testing suite in MoneyCore reads the same files and
asserts the same numbers and strings. Same numbers on both sides means ported.
Fixtures cover edge cases explicitly: month boundaries with a non-1 start day, leap
years, rounding of cents and of 5-euro suggestions, recurring frequencies,
paused/reactivated items, and both languages for formatting.

Repo layout: the PWA stays at the repo root untouched (GitHub Pages workflow
unchanged). Add `MoneyCore/` (with `Package.swift`) and `parity/` at the root. The
Xcode app project goes in `ios/` from Phase 1 (default: same repo; a separate repo
is acceptable if Xcode noise in this repo becomes annoying, decide in Phase 1).

### 4.2 Storage: SQLite behind a repository protocol

Default **GRDB** (SQLite); SwiftData only after a concrete spike proves it handles
the schema, the deterministic recurring ids and observation without surprises
(verify at execution time).

- Tables map 1:1 from the Dexie schema (v4 in `src/db/db.ts`): `transactions`,
  `categories`, `recurring`, `budgets`, `goals`, `contributions`, `settings`
  (key/value, values stored as JSON text).
- Recreate the useful indexes: `transactions(date)`, `transactions(categoryId)`,
  `transactions(recurringId, date)`, `budgets(month, categoryId)` unique,
  `contributions(goalId)`.
- **Preserve the race-free recurring materialization**: the deterministic primary key
  `rec-<recurringId>-<yyyy-mm>` plus `INSERT OR IGNORE` gives exactly the same
  guarantee IndexedDB primary-key uniqueness gives today. Do not redesign this.
- Port the DB-coupled modules onto a small repository protocol
  (`getTransactionsByMonth`, `putSetting`, ...) rather than translating Dexie calls
  one by one.
- **Live queries**: GRDB's `ValueObservation` replaces `useLiveQuery`; if SwiftData
  wins the spike, `@Query` does. No extra reactive-database dependency.

### 4.3 UI mapping

| Web today | SwiftUI |
|---|---|
| 5-tab state switch in `App.tsx` + `BottomNav` buttons (no router) | `TabView` with five tabs (native tab bar, a feel upgrade) |
| `Sheet` component (CSS overlay, no gestures) | `.sheet` with `presentationDetents`; drag to dismiss and interactive springs come free |
| Custom `Keypad` (12 buttons over pure `keypadBuffer.ts`) | SwiftUI grid of 12 buttons; the buffer logic lives in MoneyCore untouched |
| CSS Modules + `global.css`/`ui.css` (theme via `data-theme` attribute + CSS variables) | A `Theme` with the same design tokens (colors, spacing, radii) extracted from `global.css`; colors as asset-catalog color sets with dark variants; `preferredColorScheme` for the user override, system otherwise |
| Recharts (`DonutChart` PieChart, `IncomeExpenseChart` BarChart, `TrendChart` AreaChart) plus the custom SVG `Ring` | Swift Charts (`SectorMark`, `BarMark`, `AreaMark`; verify minimum iOS for `SectorMark`); `Ring` becomes a custom `Shape` |
| `alert()` / `confirm()` in Settings | `.alert` and `.confirmationDialog`; the synchronous `confirm()` pattern becomes async |
| Blob + anchor download (backup/CSV export), `<input type="file">` (import) | `ShareLink` / `fileExporter` for export, `fileImporter` for import (backup JSON and the Fineco statement) |
| Fineco statement parsing (the PWA uses the `xlsx` package) | CoreXLSX or equivalent (verify at execution time); the matching logic is in MoneyCore |
| Safe-area CSS `env()`, `--app-height` probe | Nothing, SwiftUI handles it; the WebKit workarounds die here |
| `__APP_VERSION__` via Vite define | `CFBundleShortVersionString` + build number shown in a native Diagnostica screen (keep the idea: a screen proving which build runs) |
| Typed i18n dictionaries (`en.ts`/`it.ts` sharing `TranslationKeys`, build fails on a missing key) | String Catalogs (`.xcstrings`) for en and it. The compile-time safety net must be preserved: verify at execution time whether Xcode's generated string symbols give it; otherwise add a build-phase script that fails on untranslated keys |
| Service worker + manifest + apple meta tags | Nothing |

### 4.4 Runtime portability notes

- Formatting: `Intl.NumberFormat` / `Intl.DateTimeFormat` become Foundation
  `FormatStyle` (currency, decimal, dates) with explicit `Locale("it_IT")` /
  `Locale("en_GB")`. Foundation on Linux (swift-corelibs-foundation /
  swift-foundation) can format differently from Foundation on Apple platforms:
  formatting parity fixtures run on Linux in Phase 0 and **must be re-run on macOS
  and on the device in Phase 1** before any UI exists. Test exactly the equivalents
  of `formatCents`, `monthLabel`, `decimalSeparator`.
- Ids: `crypto.randomUUID()` becomes Foundation `UUID`; keep the deterministic
  recurring ids as plain strings.
- Theme: `applyThemeToDocument` is replaced by `colorScheme` environment +
  `preferredColorScheme`.
- `document.documentElement.lang` is dropped; the language setting drives the app's
  locale explicitly (pass it to MoneyCore functions) and the String Catalog lookup.
- `lib/diagnostics.ts` is web only; write a native Diagnostica (app version, build,
  device, OS version, DB row counts).

## 5. Product invariants (unchanged in native)

- All money in integer cents; budgets integer euros; suggestions rounded to 5.
- Dates are local-timezone ISO strings `yyyy-mm-dd`, month keys `yyyy-mm`; never
  construct dates via `new Date(isoString)`.
- Recurring items: amount + frequency only, no due dates; materialized on the 1st of
  the calendar month regardless of the configurable period start day.
- Period keys stay `yyyy-mm` meaning "period starting in that month".
- English default, Italian selectable; every string through a checked mechanism
  (String Catalogs with the compile-time safety net described in Section 4.3, the
  Swift equivalent of `TranslationKeys`).
- User-facing copy: say "month", never "period"; no em dashes.
- Local-only data, no backend, no accounts. This survives until PSD2/LLM features are
  deliberately chosen, which is a separate decision with its own privacy trade-off.

## 6. Phases

### Phase 0: MoneyCore on Linux (any PC, no Mac needed, start anytime)

1. Add Vitest to the PWA (devDependency only, no runtime change) and the
   `parity/fixtures/` convention.
2. Install the swift.org toolchain on Linux; create `MoneyCore/` with `Package.swift`,
   a library target and a swift-testing test target.
3. Port module by module in the order of Section 4.1, starting with `money` +
   `dates`; each module lands together with its fixtures green on both sides.
4. Backup Codable models + validator; read a real production backup export.

Rules while Phase 0 runs: the PWA stays live and primary; bug fixes and small
improvements are fine; big new PWA features are frozen so the port does not chase a
moving target.

**Gate: every parity fixture passes under both Vitest and swift-testing, and a real
production backup parses and validates in MoneyCore.**

### Phase 1: skeleton (Mac)

Xcode + SwiftUI app in `ios/` importing MoneyCore as a local package; `TabView`
with 5 empty screens; theme, language and month-start settings wired as
environment; a free Apple ID is enough to run on the real iPhone via Xcode (7-day
re-sign, fine for development).

If the development Mac is the 2018 Intel MacBook Pro, it tops out at macOS Sequoia
15.6 and Xcode 26.3, so do not update the iPhone to an iOS major that Xcode 26.3
cannot deploy to; a used Apple Silicon Mac mini is the priced plan B. An Apple
Silicon Mac has no such constraint.

**Gate: `formatCents(123456)` and `monthLabel` render correctly in both languages on
the device, and the formatting parity fixtures are green on macOS.**

### Phase 2: data layer

GRDB schema + repository + observation; DB-coupled logic wired; backup import
through the ported validator; seeding for fresh installs; recurring materialization
on app foreground.

**Gate: import a real backup from the production PWA, then per-month income,
expenses, savings and budget status match the PWA to the cent for every month of
history.** Automate it: a small MoneyCore executable target prints per-month
totals from a backup file, a TypeScript script does the same from `src/lib`, diff
the two outputs.

### Phase 3: screens to parity, in order of daily use

1. QuickEntry sheet + keypad (the feature used every day; get entry friction right first)
2. Home (dashboard, balance gauge, pace and goals)
3. Spese (list, filters, recurring management)
4. Risparmi (goals, contributions)
5. Budget (including SmartBudgetSheet, the single largest UI file at ~420 lines;
   `smartBudget.ts` math is already ported so this is UI only)
6. Report (the 3 charts and the Fineco bank statement check, last because charts
   are the riskiest UI bet)
7. Settings (theme, language, period start, categories, export/import, delete-all,
   native Diagnostica) + Guide + Welcome flow

**Gate per screen: side-by-side parity with the PWA on the same imported dataset.**

Then the parity audit: full checklist pass against the live PWA in both languages,
every screen, CSV export byte-compared modulo separators, backup export/import
round-trip through the native app, dark/light/auto themes, fresh-install onboarding
path, iPhone screen fit.

**Gate: Fabio uses the native app in parallel with the PWA for one full month with
no mismatch. Only then does the PWA stop being primary.**

### Phase 4: the feel, and the native payoff

- **The feel:** SwiftUI springs, sheet physics, haptics, materials, following the
  `apple-design` skill. This supersedes "tappa 3" (sheet physics) of the
  Apple-design audit done on the PWA; "tappa 2" (typography, materials) may still
  be done on the PWA in the meantime.
- **Notifications** (local, no server): salary day, scheduled bills, budget warnings.
- **Widgets.** WidgetKit widgets have no text fields and no keyboard; interactivity
  is limited to Button/Toggle controls backed by App Intents (stateless background
  actions, iOS 17+, still true as of iOS 26). The widget can never host the keypad,
  so the design that actually saves time is:
  1. Category buttons on the widget, each deep-linking straight into the QuickEntry
     sheet with that category preselected and the keypad ready. One tap from the
     home screen to typing digits.
  2. Optional fixed-price buttons for habitual purchases (the usual coffee): the
     App Intent writes the transaction in the background without opening the app.
  3. The same App Intent exposed to Shortcuts/Siri and mapped to the iPhone's
     Action Button: press it anywhere, land on the keypad. Cheapest big win, no
     widget required.

  App and widget share data via an App Group container (shared SQLite file or a
  snapshot JSON); after every in-app write, ask WidgetKit to reload timelines (the
  system throttles overly frequent reloads, batch them). A read-only companion
  widget shows remaining budget for the month, refreshed on a system timeline plus
  explicit reload on writes. In a Swift project the widget extension is a plain
  second target, no config plugin.
- **Share-sheet intake** of the Fineco statement into the existing check.
- Optional: Face ID lock.

### Phase 5: distribution

- **Development:** free Apple ID + Xcode on the Mac (7-day re-sign).
- Once the app is proven (Phase 3 gate): **Apple Developer Program (99 USD/year)**,
  builds uploaded from Xcode. Personal channel: **TestFlight** for Fabio (and
  possibly one friend); builds expire 90 days after upload, so it costs a re-upload
  every 3 months. Alternative personal channel: ad hoc signed install from Xcode
  with a 1-year profile. **Hard operational rule: standard accounts get no grace
  period; an app signed under a lapsed membership or profile stops launching
  immediately. Set a reminder at month 11 to renew and rebuild.** Developer Mode on
  the iPhone is needed for non-App-Store installs; TestFlight is exempt.
- App Store publication stays optional and a separate decision.
- **Android:** a separate Kotlin + Compose project, planned only after the iOS app
  is in daily use; sideloaded APKs to friends (Google's developer-verification
  program enforces first on 2026-09-30 in Brazil, Indonesia, Singapore and
  Thailand only; EU timing is unconfirmed and under DMA scrutiny; revisit only if
  Google publishes a concrete EU date) or Play Store (one-time 25 USD).
- No more EAS, Expo Go or cloud builds. Routes ruled out, kept brief: EU DMA Web
  Distribution needs 2+ years of membership and 1M+ EU installs; alternative
  marketplaces (AltStore PAL) cost the same 99 USD/year for no benefit at this
  scale; the Enterprise Program needs a 100+ employee organization; unlisted App
  Store distribution still goes through full App Review; free-Apple-ID signing
  (AltStore Classic/SideStore) expires every 7 days and caps at 3 apps.

## 7. Effort estimate (honest)

Phase 0 is a handful of focused sessions (a mechanical port with an objective
finish line); Phases 1 and 2 a few sessions each; Phase 3 is the bulk, roughly one
session per screen with QuickEntry and Budget the heaviest; Phases 4 and 5 a few
more. Realistically **several weeks of evening-paced sessions end to end, not a
weekend.** Learning Swift along the way is part of the cost and part of the point.

## 8. Checkpoint

After Phase 2 there is a formal checkpoint: the data layer works and the real
effort of Phase 3 is now visible. There is no Capacitor fallback anymore (decided
2026-08-31). If the cost stops being worth it, the PWA simply remains the product;
MoneyCore and the parity fixtures stay valuable as an executable specification of
the domain, and nothing done is wasted.

## 9. Verify-at-execution-time checklist

Do not trust any of these names/choices without re-checking on the day:
- [ ] swift.org toolchain version on Linux and swift-testing availability there
- [ ] Foundation formatting parity, Linux vs Apple platforms
- [ ] Xcode version the development Mac supports, and the iOS version on Fabio's
      iPhone (deployment target)
- [ ] GRDB vs SwiftData spike outcome
- [ ] Swift Charts `SectorMark` minimum iOS
- [ ] String Catalog compile-time symbol generation for untranslated keys
- [ ] CoreXLSX health (or an alternative) for the Fineco statement format
- [ ] WidgetKit interactivity limits still as described
- [ ] Apple Developer Program price, TestFlight 90-day expiry, profile validity and
      the no-grace-period rule still current
- [ ] Google developer-verification status for EU/Italy (Android, later)
- [ ] Re-read project memory for decisions made after 2026-08-31 that touch this plan

## 10. Tooling and references

Claude Code skills used: `write-swift` (Swift style, from Phase 0 on), `apple-design`
(Phase 4 feel). Living roadmap artifact:
https://claude.ai/code/artifact/d34dddd1-789e-40e5-a2fd-26d4a9365b97 (revision 2,
keep it updated as phases complete). Apple-design audit of the PWA:
https://claude.ai/code/artifact/195d73ab-6c77-4a31-8775-bc29ade8f654.
