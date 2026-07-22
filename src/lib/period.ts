// Module-level mirror of the active accounting-period start day, for pure
// (non-React) lib functions (stats.ts, chart label helpers, ...) that can't
// consume React context. The period context (src/period/context.tsx) calls
// setActivePeriodStartDay synchronously during its own render, before any
// descendant renders, so callers always see the day that matches what's on
// screen. Mirrors the pattern of src/lib/locale.ts for the active language.
import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import {
  addMonths,
  daysInMonth,
  monthLabel,
  monthLabelShort,
  parseISODate,
  toISODate,
  todayISO,
} from './dates'
import { localeTag } from './locale'

export const DEFAULT_PERIOD_START_DAY = 1

let activePeriodStartDay: number = DEFAULT_PERIOD_START_DAY

export function setActivePeriodStartDay(day: number): void {
  activePeriodStartDay = day
}

export function getActivePeriodStartDay(): number {
  return activePeriodStartDay
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Reads the stored period start day; falls back to the default (1) if unset or invalid (must be an integer 1-31). */
export async function getStoredPeriodStartDay(): Promise<number> {
  const rec = await db.settings.get(SETTINGS_KEYS.periodStartDay)
  const value = rec?.value
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) return value
  return DEFAULT_PERIOD_START_DAY
}

export async function setStoredPeriodStartDay(day: number): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.periodStartDay, value: day })
}

/** First ISO date of the period identified by `periodKey` ("yyyy-mm" of the calendar month it starts in). Clamps to the last day of the month for short months (e.g. day 31 in February). */
export function periodStartISO(periodKey: string): string {
  const day = Math.min(activePeriodStartDay, daysInMonth(periodKey))
  return `${periodKey}-${String(day).padStart(2, '0')}`
}

/** Last ISO date of the period identified by `periodKey`: the day before the next period's start. */
export function periodEndISO(periodKey: string): string {
  const nextStart = parseISODate(periodStartISO(addMonths(periodKey, 1)))
  const d = new Date(nextStart)
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

/** The period key ("yyyy-mm" of the calendar month it starts in) that contains ISO date `iso`. */
export function periodKeyForDate(iso: string): string {
  const candidate = iso.slice(0, 7)
  if (iso >= periodStartISO(candidate)) return candidate
  return addMonths(candidate, -1)
}

/** The period key containing today. */
export function currentPeriodKey(): string {
  return periodKeyForDate(todayISO())
}

/** Fraction (0-1) of the period elapsed, based on real "today": 1 if the period is fully past, 0 if fully future, otherwise days-so-far / total-days. With the default start day (1) this matches the old monthElapsedFraction exactly. */
export function periodElapsedFraction(periodKey: string): number {
  const nowKey = currentPeriodKey()
  if (periodKey < nowKey) return 1
  if (periodKey > nowKey) return 0
  const start = parseISODate(periodStartISO(periodKey))
  const end = parseISODate(periodEndISO(periodKey))
  const today = parseISODate(todayISO())
  const daysSince = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)
  const elapsed = daysSince(start, today) + 1
  const total = daysSince(start, end) + 1
  return Math.min(1, elapsed / total)
}

/** Human label for a period, in the active language. With start day 1, identical to monthLabel (e.g. "July 2026"). Otherwise the full date range, e.g. "26 Jul – 25 Aug 2026" / "26 lug – 25 ago 2026". */
export function periodLabel(periodKey: string): string {
  if (activePeriodStartDay === 1) return monthLabel(periodKey)
  const start = parseISODate(periodStartISO(periodKey))
  const end = parseISODate(periodEndISO(periodKey))
  const locale = localeTag()
  const startMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(start).replace(/\.$/, '')
  const endMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(end).replace(/\.$/, '')
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`
}

/** Short label for a period, for chart x-axes. With start day 1, identical to monthLabelShort (e.g. "Jul 26"). Otherwise the period's start day, e.g. "26 Feb". */
export function periodLabelShort(periodKey: string): string {
  if (activePeriodStartDay === 1) return monthLabelShort(periodKey)
  const start = parseISODate(periodStartISO(periodKey))
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'short' }).format(start).replace(/\.$/, '')
  return `${start.getDate()} ${capitalize(month)}`
}

/** Compact label for a period, no year. With start day 1, the month name only (what monthLabel(key).split(' ')[0] produces today). Otherwise the date range without year, e.g. "26 lug – 25 ago". */
export function periodLabelCompact(periodKey: string): string {
  if (activePeriodStartDay === 1) return monthLabel(periodKey).split(' ')[0]
  const start = parseISODate(periodStartISO(periodKey))
  const end = parseISODate(periodEndISO(periodKey))
  const locale = localeTag()
  const startMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(start).replace(/\.$/, '')
  const endMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(end).replace(/\.$/, '')
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
}
