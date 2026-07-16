import { localeTag } from './locale'

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(minimumFractionDigits: number, maximumFractionDigits: number): Intl.NumberFormat {
  const locale = localeTag()
  const key = `${locale}:${minimumFractionDigits}:${maximumFractionDigits}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits,
      maximumFractionDigits,
    })
    formatterCache.set(key, formatter)
  }
  return formatter
}

/** Format integer cents as "1.234,56 €" (it) / "€1,234.56" (en), per the active language */
export function formatCents(cents: number): string {
  return getFormatter(2, 2).format(cents / 100)
}

/** Format integer cents, dropping decimals when they are .00 */
export function formatCentsCompact(cents: number): string {
  if (cents % 100 === 0) return getFormatter(0, 0).format(cents / 100)
  return getFormatter(2, 2).format(cents / 100)
}

/** Format integer euros (budgets) as "150 €" / "€150" */
export function formatEuros(euros: number): string {
  return getFormatter(0, 0).format(euros)
}

/** Round to nearest 5 (used for suggested budgets) */
export function roundToNearest5(euros: number): number {
  return Math.round(euros / 5) * 5
}

/** Parse a keypad string (e.g. "12,50" or "12.50" or "1250") into integer cents.
 * Accepts either decimal separator regardless of active language. */
export function parseAmountToCents(input: string): number {
  if (!input) return 0
  const normalized = input.replace(',', '.')
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return 0
  return Math.round(value * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}
