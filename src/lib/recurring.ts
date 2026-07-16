import { db } from '../db/db'
import { makeId } from './id'
import type { Recurring, RecurringFrequency } from '../db/types'
import { currentMonthKey, firstOfMonth, monthsBetweenInclusive } from './dates'

/** Monthly-equivalent amount in cents for a recurring item, rounded to the nearest cent. */
export function monthlyEquivalentCents(amountCents: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amountCents
    case 'bimonthly':
      return Math.round(amountCents / 2)
    case 'quarterly':
      return Math.round(amountCents / 3)
    case 'annual':
      return Math.round(amountCents / 12)
  }
}

/**
 * Materialize one transaction per active recurring item for every month from
 * its creation month through the current month, skipping months that already
 * have a materialized transaction (idempotent). Past transactions are never
 * touched, so editing/deactivating a recurring item only affects future runs.
 */
export async function materializeRecurring(): Promise<void> {
  const nowKey = currentMonthKey()
  const items: Recurring[] = (await db.recurring.toArray()).filter((r) => r.active)

  for (const item of items) {
    const startMonth = item.createdMonth && item.createdMonth <= nowKey ? item.createdMonth : nowKey
    const months = monthsBetweenInclusive(startMonth, nowKey)
    for (const monthKey of months) {
      const dateISO = firstOfMonth(monthKey)
      const existing = await db.transactions
        .where('recurringId')
        .equals(item.id)
        .and((t) => t.date === dateISO)
        .first()
      if (existing) continue
      await db.transactions.add({
        id: makeId(),
        amountCents: monthlyEquivalentCents(item.amountCents, item.frequency),
        type: item.type,
        categoryId: item.categoryId,
        date: dateISO,
        recurringId: item.id,
      })
    }
  }
}

export const FREQUENCY_LABELS_IT: Record<RecurringFrequency, string> = {
  monthly: 'Mensile',
  bimonthly: 'Bimestrale',
  quarterly: 'Trimestrale',
  annual: 'Annuale',
}
