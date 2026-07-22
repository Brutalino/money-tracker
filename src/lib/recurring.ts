import Dexie from 'dexie'
import { db } from '../db/db'
import type { Recurring, RecurringFrequency, Transaction } from '../db/types'
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
 * Deterministic id for a recurring item's materialized transaction in a given month.
 * Because `id` is the primary key, IndexedDB always enforces it as unique — so two
 * concurrent materializer runs (two tabs, two app instances on the same device,
 * React StrictMode's double-invoked effects, etc.) racing to insert the same
 * month's transaction will have the second `add()` rejected with a ConstraintError
 * instead of creating a duplicate row.
 */
export function makeRecurringTxId(recurringId: string, monthKey: string): string {
  return `rec-${recurringId}-${monthKey}`
}

/**
 * Materialize one transaction per active recurring item for every month from
 * its creation month through the current month, skipping months that already
 * have a materialized transaction (idempotent). Past transactions are never
 * touched, so editing/deactivating a recurring item only affects future runs.
 *
 * The whole pass runs inside a single `rw` transaction on `transactions` so
 * concurrent calls within the same browser tab/instance are serialized by
 * Dexie, and each insert uses a deterministic id (see makeRecurringTxId) so
 * that even a genuinely concurrent writer (another tab, another instance)
 * can't create a duplicate row — the primary-key collision is caught and
 * ignored below.
 */
export async function materializeRecurring(): Promise<void> {
  // Deliberately calendar-month-based, independent of the user's accounting-
  // period start day (src/lib/period.ts): every period of any start day
  // contains exactly one 1st-of-month, so each period naturally ends up with
  // one materialization per active recurring item.
  const nowKey = currentMonthKey()
  const items: Recurring[] = (await db.recurring.toArray()).filter((r) => r.active)

  await db.transaction('rw', db.transactions, async () => {
    for (const item of items) {
      const startMonth = item.createdMonth && item.createdMonth <= nowKey ? item.createdMonth : nowKey
      const months = monthsBetweenInclusive(startMonth, nowKey)
      for (const monthKey of months) {
        const dateISO = firstOfMonth(monthKey)
        const existing = await db.transactions
          .where('[recurringId+date]')
          .equals([item.id, dateISO])
          .first()
        if (existing) continue
        try {
          await db.transactions.add({
            id: makeRecurringTxId(item.id, monthKey),
            amountCents: monthlyEquivalentCents(item.amountCents, item.frequency),
            type: item.type,
            categoryId: item.categoryId,
            date: dateISO,
            recurringId: item.id,
          })
        } catch (err) {
          // Another concurrent instance already inserted this exact month's
          // transaction between our existence check and our add() — that's fine,
          // the deterministic id means it's the same logical transaction.
          if (!(err instanceof Dexie.ConstraintError)) throw err
        }
      }
    }
  })
}

/**
 * One-time startup migration: finds materialized transactions (those with a
 * recurringId) that share the same recurringId+date — i.e. duplicates created
 * by the pre-fix check-then-insert race — and deletes all but one per group.
 * Safe to run repeatedly (no-op once deduped).
 */
export async function dedupeMaterializedTransactions(): Promise<number> {
  let removedCount = 0
  await db.transaction('rw', db.transactions, async () => {
    const materialized = await db.transactions.filter((t) => !!t.recurringId).toArray()
    const groups = new Map<string, Transaction[]>()
    for (const t of materialized) {
      const key = `${t.recurringId}:${t.date}`
      const arr = groups.get(key)
      if (arr) arr.push(t)
      else groups.set(key, [t])
    }
    const idsToDelete: string[] = []
    for (const group of groups.values()) {
      if (group.length <= 1) continue
      // Prefer keeping the row with the new deterministic id if one exists in the
      // group; otherwise keep the first one deterministically (lowest id) so all
      // instances converge on the same choice.
      const sorted = [...group].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      const deterministicId = makeRecurringTxId(group[0].recurringId!, group[0].date.slice(0, 7))
      const keeper = sorted.find((t) => t.id === deterministicId) ?? sorted[0]
      for (const t of group) {
        if (t.id !== keeper.id) idsToDelete.push(t.id)
      }
    }
    if (idsToDelete.length > 0) {
      await db.transactions.bulkDelete(idsToDelete)
      removedCount = idsToDelete.length
    }
  })
  return removedCount
}
