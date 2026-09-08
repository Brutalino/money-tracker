import { parityModule } from './harness'
import { makeRecurringTxId, monthlyEquivalentCents } from '../src/lib/recurring'
import { monthsBetweenInclusive } from '../src/lib/dates'
import type { RecurringFrequency } from '../src/db/types'

const FREQUENCIES: RecurringFrequency[] = ['monthly', 'bimonthly', 'quarterly', 'annual']
const AMOUNTS = [1000, 1001, 1002, 1003, 1250, 999, 1, 5, 7, 100000, 12345]

interface MonthlyEquivalentInput {
  amountCents: number
  frequency: RecurringFrequency
}

interface MakeIdInput {
  recurringId: string
  monthKey: string
}

interface MonthsToMaterializeInput {
  createdMonth: string | undefined
  nowKey: string
}

/**
 * There is no standalone TS export for "which months to materialize" —
 * materializeRecurring interleaves it with the DB writes. This replicates
 * just its first two lines (src/lib/recurring.ts): the start month defaults
 * to `nowKey` when `createdMonth` is unset, and materializes nothing when
 * that start month is after `nowKey`.
 */
function computeMonthsToMaterialize(input: MonthsToMaterializeInput): string[] {
  const startMonth = input.createdMonth ?? input.nowKey
  if (startMonth > input.nowKey) return []
  return monthsBetweenInclusive(startMonth, input.nowKey)
}

await parityModule('recurring', {
  monthlyEquivalentCents: {
    cases: FREQUENCIES.flatMap((frequency) =>
      AMOUNTS.map((amountCents) => ({
        name: `${amountCents}c, ${frequency}`,
        input: { amountCents, frequency },
      }))
    ) as { name: string; input: MonthlyEquivalentInput }[],
    impl: (input: MonthlyEquivalentInput) => monthlyEquivalentCents(input.amountCents, input.frequency),
  },
  makeRecurringTxId: {
    cases: [
      { name: 'abc, 2026-09', input: { recurringId: 'abc', monthKey: '2026-09' } },
      { name: 'rec-x, 2024-02', input: { recurringId: 'rec-x', monthKey: '2024-02' } },
    ] as { name: string; input: MakeIdInput }[],
    impl: (input: MakeIdInput) => makeRecurringTxId(input.recurringId, input.monthKey),
  },
  monthsToMaterialize: {
    cases: [
      { name: 'createdMonth 2026-06, now 2026-09', input: { createdMonth: '2026-06', nowKey: '2026-09' } },
      { name: 'createdMonth 2026-09, now 2026-09', input: { createdMonth: '2026-09', nowKey: '2026-09' } },
      { name: 'createdMonth 2026-10, now 2026-09 (future, empty)', input: { createdMonth: '2026-10', nowKey: '2026-09' } },
      { name: 'createdMonth undefined, now 2026-09', input: { createdMonth: undefined, nowKey: '2026-09' } },
    ] as { name: string; input: MonthsToMaterializeInput }[],
    impl: computeMonthsToMaterialize,
  },
})
