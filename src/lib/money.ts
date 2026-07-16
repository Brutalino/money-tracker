const eurFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const eurFormatterNoDecimals = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format integer cents as "1.234,56 €" */
export function formatCents(cents: number): string {
  return eurFormatter.format(cents / 100)
}

/** Format integer cents, dropping decimals when they are .00 */
export function formatCentsCompact(cents: number): string {
  if (cents % 100 === 0) return eurFormatterNoDecimals.format(cents / 100)
  return eurFormatter.format(cents / 100)
}

/** Format integer euros (budgets) as "150 €" */
export function formatEuros(euros: number): string {
  return eurFormatterNoDecimals.format(euros)
}

/** Round to nearest 5 (used for suggested budgets) */
export function roundToNearest5(euros: number): number {
  return Math.round(euros / 5) * 5
}

/** Parse a keypad string (e.g. "12,50" or "12.50" or "1250") into integer cents */
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
