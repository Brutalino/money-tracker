export const MONTH_NAMES_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

export const MONTH_NAMES_SHORT_IT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
]

export const DAY_NAMES_IT = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
]

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

/** Month label e.g. "Luglio 2026" */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES_IT[m - 1]} ${y}`
}

export function monthLabelShort(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES_SHORT_IT[m - 1]} ${String(y).slice(2)}`
}

/** Day label e.g. "Lunedì 14 luglio" */
export function dayLabel(iso: string): string {
  const date = parseISODate(iso)
  const dayName = DAY_NAMES_IT[date.getDay()]
  const day = date.getDate()
  const month = MONTH_NAMES_IT[date.getMonth()].toLowerCase()
  return `${dayName} ${day} ${month}`
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

/** Fraction (0-1) of the month elapsed, based on real "today" if monthKey is current month, else 1 if past, 0 if future */
export function monthElapsedFraction(monthKey: string): number {
  const now = new Date()
  const nowKey = toMonthKey(now)
  if (monthKey < nowKey) return 1
  if (monthKey > nowKey) return 0
  const total = daysInMonth(monthKey)
  return Math.min(1, now.getDate() / total)
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

export function isFutureMonth(monthKey: string): boolean {
  return monthKey > currentMonthKey()
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
