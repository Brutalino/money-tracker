import type { Transaction, Category, Recurring, Budget, Goal, Contribution } from '../src/db/types'

/**
 * One realistic dataset shared by every `stats` parity case, so the Swift
 * fixture ships enough of it (via each case's `input`) to be fully
 * self-contained. 3 expense categories + 1 income category; ~40
 * transactions across 2026-05..2026-09 (10 materialized-recurring +
 * 30 manual, dated so 2026-05 has no history in the 3 months before it —
 * the "no prior data" case for variableSpendingAverages/suggestBudgets);
 * 2 active recurring items (one monthly expense, one annual income) plus
 * one paused; budgets for 2026-08 and 2026-09; 1 goal; 5 contributions
 * spanning 2026-05..2026-09, including one dated exactly on the
 * startDay-26 period boundary (2026-08-26).
 */

export const categories: Category[] = [
  { id: 'cat-food', name: 'Food', emoji: '🍔', color: '#e07856', kind: 'expense', sortOrder: 0, archived: false },
  { id: 'cat-transport', name: 'Transport', emoji: '🚌', color: '#4a90d9', kind: 'expense', sortOrder: 1, archived: false },
  { id: 'cat-entertainment', name: 'Entertainment', emoji: '🎬', color: '#9b6bd9', kind: 'expense', sortOrder: 2, archived: false },
  { id: 'cat-salary', name: 'Salary', emoji: '💶', color: '#4caf50', kind: 'income', sortOrder: 0, archived: false },
]

export const expenseCategoryIds = categories.filter((c) => c.kind === 'expense').map((c) => c.id)

/** rec-internet (active, monthly expense) and rec-bonus (active, annual
 * income) are materialized below for every month 2026-05..2026-09; rec-gym
 * is paused and therefore has no materialized transactions in this dataset,
 * matching how `materializeRecurring` only ever runs for active items. */
export const recurring: Recurring[] = [
  { id: 'rec-internet', name: 'Internet', amountCents: 3000, categoryId: 'cat-transport', type: 'expense', frequency: 'monthly', active: true, createdMonth: '2026-01' },
  { id: 'rec-bonus', name: 'Annual bonus', amountCents: 120000, categoryId: 'cat-salary', type: 'income', frequency: 'annual', active: true, createdMonth: '2025-01' },
  { id: 'rec-gym', name: 'Gym', amountCents: 4000, categoryId: 'cat-entertainment', type: 'expense', frequency: 'monthly', active: false, createdMonth: '2026-01' },
]

const RECURRING_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']

/** Monthly-equivalent cents mirroring `monthlyEquivalentCents` for the two
 * active items above (kept as literals here since parity/recurring.test.ts
 * already covers that function on its own). */
const materializedTransactions: Transaction[] = RECURRING_MONTHS.flatMap((m) => [
  {
    id: `rec-rec-internet-${m}`,
    amountCents: 3000, // monthly: unchanged
    type: 'expense',
    categoryId: 'cat-transport',
    date: `${m}-01`,
    recurringId: 'rec-internet',
  },
  {
    id: `rec-rec-bonus-${m}`,
    amountCents: 10000, // annual 120000 / 12, Math.round
    type: 'income',
    categoryId: 'cat-salary',
    date: `${m}-01`,
    recurringId: 'rec-bonus',
  },
])

const manualTransactions: Transaction[] = [
  // 2026-05
  { id: 'tx-1', amountCents: 2500, type: 'expense', categoryId: 'cat-food', date: '2026-05-03' },
  { id: 'tx-2', amountCents: 1800, type: 'expense', categoryId: 'cat-food', date: '2026-05-15' },
  { id: 'tx-3', amountCents: 1200, type: 'expense', categoryId: 'cat-transport', date: '2026-05-10' },
  { id: 'tx-4', amountCents: 3500, type: 'expense', categoryId: 'cat-entertainment', date: '2026-05-20' },
  { id: 'tx-5', amountCents: 900, type: 'expense', categoryId: 'cat-food', date: '2026-05-25' },
  { id: 'tx-6', amountCents: 600, type: 'expense', categoryId: 'cat-transport', date: '2026-05-28' },
  // 2026-06
  { id: 'tx-7', amountCents: 2200, type: 'expense', categoryId: 'cat-food', date: '2026-06-02' },
  { id: 'tx-8', amountCents: 4000, type: 'expense', categoryId: 'cat-entertainment', date: '2026-06-08' },
  { id: 'tx-9', amountCents: 1500, type: 'expense', categoryId: 'cat-transport', date: '2026-06-12' },
  { id: 'tx-10', amountCents: 1700, type: 'expense', categoryId: 'cat-food', date: '2026-06-18' },
  { id: 'tx-11', amountCents: 2800, type: 'expense', categoryId: 'cat-entertainment', date: '2026-06-22' },
  { id: 'tx-12', amountCents: 900, type: 'expense', categoryId: 'cat-transport', date: '2026-06-27' },
  // 2026-07
  { id: 'tx-13', amountCents: 2600, type: 'expense', categoryId: 'cat-food', date: '2026-07-01' },
  { id: 'tx-14', amountCents: 1100, type: 'expense', categoryId: 'cat-transport', date: '2026-07-05' },
  { id: 'tx-15', amountCents: 3200, type: 'expense', categoryId: 'cat-entertainment', date: '2026-07-11' },
  { id: 'tx-16', amountCents: 2100, type: 'expense', categoryId: 'cat-food', date: '2026-07-19' },
  { id: 'tx-17', amountCents: 700, type: 'expense', categoryId: 'cat-transport', date: '2026-07-23' },
  { id: 'tx-18', amountCents: 1900, type: 'expense', categoryId: 'cat-entertainment', date: '2026-07-29' },
  // 2026-08
  { id: 'tx-19', amountCents: 2400, type: 'expense', categoryId: 'cat-food', date: '2026-08-03' },
  { id: 'tx-20', amountCents: 1300, type: 'expense', categoryId: 'cat-transport', date: '2026-08-07' },
  { id: 'tx-21', amountCents: 3600, type: 'expense', categoryId: 'cat-entertainment', date: '2026-08-14' },
  { id: 'tx-22', amountCents: 1600, type: 'expense', categoryId: 'cat-food', date: '2026-08-20' },
  { id: 'tx-23', amountCents: 800, type: 'expense', categoryId: 'cat-transport', date: '2026-08-24' },
  { id: 'tx-24', amountCents: 2200, type: 'expense', categoryId: 'cat-entertainment', date: '2026-08-26' }, // on the startDay-26 boundary
  // 2026-09
  { id: 'tx-25', amountCents: 2000, type: 'expense', categoryId: 'cat-food', date: '2026-09-02' },
  { id: 'tx-26', amountCents: 1000, type: 'expense', categoryId: 'cat-transport', date: '2026-09-05' },
  { id: 'tx-27', amountCents: 3000, type: 'expense', categoryId: 'cat-entertainment', date: '2026-09-09' },
  { id: 'tx-28', amountCents: 1400, type: 'expense', categoryId: 'cat-food', date: '2026-09-14' },
  { id: 'tx-29', amountCents: 500, type: 'expense', categoryId: 'cat-transport', date: '2026-09-18' },
  { id: 'tx-30', amountCents: 2600, type: 'expense', categoryId: 'cat-entertainment', date: '2026-09-25' },
]

export const transactions: Transaction[] = [...materializedTransactions, ...manualTransactions]

export const budgets: Budget[] = [
  { id: 'budget-2026-08-food', month: '2026-08', categoryId: 'cat-food', amountEuros: 150 },
  { id: 'budget-2026-08-transport', month: '2026-08', categoryId: 'cat-transport', amountEuros: 80 },
  { id: 'budget-2026-08-entertainment', month: '2026-08', categoryId: 'cat-entertainment', amountEuros: 100 },
  { id: 'budget-2026-09-food', month: '2026-09', categoryId: 'cat-food', amountEuros: 150 },
  { id: 'budget-2026-09-transport', month: '2026-09', categoryId: 'cat-transport', amountEuros: 90 },
  { id: 'budget-2026-09-entertainment', month: '2026-09', categoryId: 'cat-entertainment', amountEuros: 110 },
]

export const goals: Goal[] = [{ id: 'goal-vacation', name: 'Vacation', emoji: '🏖️', targetCents: 200000, deadline: '2026-12', archived: false, sortOrder: 0 }]

export const contributions: Contribution[] = [
  { id: 'contrib-1', goalId: 'goal-vacation', amountCents: 10000, date: '2026-05-10' },
  { id: 'contrib-2', goalId: 'goal-vacation', amountCents: 15000, date: '2026-06-15' },
  { id: 'contrib-3', goalId: 'goal-vacation', amountCents: 20000, date: '2026-07-20' },
  { id: 'contrib-4', goalId: 'goal-vacation', amountCents: 12000, date: '2026-08-26' }, // on the startDay-26 boundary
  { id: 'contrib-5', goalId: 'goal-vacation', amountCents: 18000, date: '2026-09-05' },
]
