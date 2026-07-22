import { localeTag } from './locale'

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Returns "yyyy-mm" for the current month */
export function currentMonthKey(): string {
  return toMonthKey(new Date())
}

export function toMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Month label e.g. "July 2026" / "Luglio 2026", in the active language */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'long' }).format(d)
  return `${capitalize(month)} ${y}`
}

export function monthLabelShort(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'short' }).format(d).replace(/\.$/, '')
  return `${capitalize(month)} ${String(y).slice(2)}`
}

/** Day label e.g. "Monday 14 July" / "Lunedì 14 luglio" */
export function dayLabel(iso: string): string {
  const date = parseISODate(iso)
  const locale = localeTag()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  const day = date.getDate()
  return `${capitalize(weekday)} ${day} ${month}`
}

/** Day + short month label, in the active language, e.g. "22 Jul" / "22 lug". Not capitalized — meant to sit mid-sentence. */
export function dayMonthLabel(iso: string): string {
  const date = parseISODate(iso)
  const month = new Intl.DateTimeFormat(localeTag(), { month: 'short' }).format(date).replace(/\.$/, '')
  return `${date.getDate()} ${month}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split('-').map(Number)
  return { year: y, month: m }
}

/** Add `delta` months to a month key, returns new "yyyy-mm" */
export function addMonths(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey)
  const d = new Date(year, month - 1 + delta, 1)
  return toMonthKey(d)
}

/** First day ISO date of a given month key */
export function firstOfMonth(monthKey: string): string {
  return `${monthKey}-01`
}

/** Number of days in the month */
export function daysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey)
  return new Date(year, month, 0).getDate()
}

/** List of the last N month keys ending at (and including) monthKey, oldest first */
export function lastNMonths(monthKey: string, n: number): string[] {
  const result: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    result.push(addMonths(monthKey, -i))
  }
  return result
}

/** Number of months from `a` to `b` (b - a), can be negative */
export function monthDiff(a: string, b: string): number {
  const pa = parseMonthKey(a)
  const pb = parseMonthKey(b)
  return (pb.year - pa.year) * 12 + (pb.month - pa.month)
}

/** Group of ISO dates -> label. Compares month keys against monthKey list to build sequential range */
export function monthsBetweenInclusive(fromKey: string, toKey: string): string[] {
  const result: string[] = []
  let cur = fromKey
  // safety cap to avoid infinite loop on bad input
  let guard = 0
  while (cur <= toKey && guard < 1200) {
    result.push(cur)
    cur = addMonths(cur, 1)
    guard++
  }
  return result
}
