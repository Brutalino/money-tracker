// fake-indexeddb must be installed before anything that imports Dexie (via
// db.ts) so Dexie sees a working `indexedDB` global at import time.
import 'fake-indexeddb/auto'

import { parityModule } from './harness'
import { db } from '../src/db/db'
import {
  getMonthTransactions,
  sumCents,
  groupByCategory,
  sumBudgetEuros,
  variableSpendingAverages,
  suggestBudgets,
  activeRecurringMonthlyTotals,
  averageMonthlyIncomeCents,
  categoryMonthlyAverageCents,
  averageMonthlyContribution,
  budgetStatus,
  sumContributionCents,
  getPeriodContributions,
  balanceUpToPeriodCents,
  computePace,
} from '../src/lib/stats'
import { setActivePeriodStartDay } from '../src/lib/period'
import { lastNMonths } from '../src/lib/dates'
import type { Transaction, Recurring, Budget, Contribution } from '../src/db/types'
import { transactions as datasetTransactions, recurring as datasetRecurring, budgets as datasetBudgets, contributions as datasetContributions, expenseCategoryIds } from './statsDataset'

async function seedTransactions(rows: Transaction[]): Promise<void> {
  await db.transactions.clear()
  if (rows.length > 0) await db.transactions.bulkAdd(rows)
}

async function seedContributions(rows: Contribution[]): Promise<void> {
  await db.contributions.clear()
  if (rows.length > 0) await db.contributions.bulkAdd(rows)
}

async function seedRecurring(rows: Recurring[]): Promise<void> {
  await db.recurring.clear()
  if (rows.length > 0) await db.recurring.bulkAdd(rows)
}

interface MonthTransactionsInput {
  transactions: Transaction[]
  periodKey: string
  startDay: number
}

interface TransactionsInput {
  transactions: Transaction[]
}

interface BudgetsInput {
  budgets: Budget[]
}

interface ContributionsInput {
  contributions: Contribution[]
}

interface VariableAveragesInput {
  transactions: Transaction[]
  periodKey: string
  startDay: number
  expenseCategoryIds: string[]
}

interface RecurringInput {
  recurring: Recurring[]
}

interface AverageMonthlyIncomeInput {
  transactions: Transaction[]
  periodKey: string
  startDay: number
}

interface CategoryMonthlyAverageInput {
  transactions: Transaction[]
  categoryId: string
  uptoPeriodKey: string
  startDay: number
  useAllExpenses: boolean
}

interface AverageMonthlyContributionInput {
  contributions: Contribution[]
  months: string[]
  startDay: number
}

interface FractionInput {
  fraction: number
}

interface PeriodContributionsInput {
  contributions: Contribution[]
  periodKey: string
  startDay: number
}

interface BalanceUpToPeriodInput {
  transactions: Transaction[]
  contributions: Contribution[]
  periodKey: string
  startDay: number
}

interface PaceInput {
  spentFraction: number
  elapsedFraction: number
}

const MONTHS_2026_05_TO_09 = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']

await parityModule('stats', {
  monthTransactions: {
    cases: ['2026-08', '2026-09'].flatMap((periodKey) =>
      [1, 26].map((startDay) => ({
        name: `${periodKey}, startDay ${startDay}`,
        input: { transactions: datasetTransactions, periodKey, startDay },
      }))
    ) as { name: string; input: MonthTransactionsInput }[],
    impl: async (input: MonthTransactionsInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      return getMonthTransactions(input.periodKey)
    },
  },
  sumCents: {
    cases: [{ name: 'full dataset', input: { transactions: datasetTransactions } }] as { name: string; input: TransactionsInput }[],
    impl: (input: TransactionsInput) => sumCents(input.transactions),
  },
  groupByCategory: {
    cases: [{ name: 'full dataset', input: { transactions: datasetTransactions } }] as { name: string; input: TransactionsInput }[],
    impl: (input: TransactionsInput) => Object.fromEntries(groupByCategory(input.transactions)),
  },
  sumBudgetEuros: {
    cases: [{ name: 'full dataset', input: { budgets: datasetBudgets } }] as { name: string; input: BudgetsInput }[],
    impl: (input: BudgetsInput) => sumBudgetEuros(input.budgets),
  },
  sumContributionCents: {
    cases: [{ name: 'full dataset', input: { contributions: datasetContributions } }] as { name: string; input: ContributionsInput }[],
    impl: (input: ContributionsInput) => sumContributionCents(input.contributions),
  },
  variableSpendingAverages: {
    cases: [
      { name: '2026-09, startDay 1', input: { transactions: datasetTransactions, periodKey: '2026-09', startDay: 1, expenseCategoryIds } },
      { name: '2026-09, startDay 26', input: { transactions: datasetTransactions, periodKey: '2026-09', startDay: 26, expenseCategoryIds } },
      { name: '2026-05, no prior data', input: { transactions: datasetTransactions, periodKey: '2026-05', startDay: 1, expenseCategoryIds } },
    ] as { name: string; input: VariableAveragesInput }[],
    impl: async (input: VariableAveragesInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      const { averagesCents, monthsWithData } = await variableSpendingAverages(input.periodKey, input.expenseCategoryIds)
      return { averagesCents: Object.fromEntries(averagesCents), monthsWithData }
    },
  },
  suggestBudgets: {
    cases: [
      { name: '2026-09, startDay 1', input: { transactions: datasetTransactions, periodKey: '2026-09', startDay: 1, expenseCategoryIds } },
      { name: '2026-09, startDay 26', input: { transactions: datasetTransactions, periodKey: '2026-09', startDay: 26, expenseCategoryIds } },
      { name: '2026-05, no prior data', input: { transactions: datasetTransactions, periodKey: '2026-05', startDay: 1, expenseCategoryIds } },
    ] as { name: string; input: VariableAveragesInput }[],
    impl: async (input: VariableAveragesInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      const result = await suggestBudgets(input.periodKey, input.expenseCategoryIds)
      return Object.fromEntries(result)
    },
  },
  activeRecurringMonthlyTotals: {
    cases: [{ name: 'full dataset', input: { recurring: datasetRecurring } }] as { name: string; input: RecurringInput }[],
    impl: async (input: RecurringInput) => {
      await seedRecurring(input.recurring)
      return activeRecurringMonthlyTotals()
    },
  },
  averageMonthlyIncomeCents: {
    cases: [
      { name: '2026-09', input: { transactions: datasetTransactions, periodKey: '2026-09', startDay: 1 } },
      { name: '2026-06', input: { transactions: datasetTransactions, periodKey: '2026-06', startDay: 1 } },
    ] as { name: string; input: AverageMonthlyIncomeInput }[],
    impl: async (input: AverageMonthlyIncomeInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      return averageMonthlyIncomeCents(input.periodKey)
    },
  },
  categoryMonthlyAverageCents: {
    cases: expenseCategoryIds.flatMap((categoryId) =>
      [true, false].map((useAllExpenses) => ({
        name: `${categoryId}, useAllExpenses ${useAllExpenses}`,
        input: { transactions: datasetTransactions, categoryId, uptoPeriodKey: '2026-09', startDay: 1, useAllExpenses },
      }))
    ) as { name: string; input: CategoryMonthlyAverageInput }[],
    impl: async (input: CategoryMonthlyAverageInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      return categoryMonthlyAverageCents(input.categoryId, input.uptoPeriodKey, input.useAllExpenses)
    },
  },
  averageMonthlyContribution: {
    cases: [
      { name: 'lastNMonths(2026-09, 3), startDay 1', input: { contributions: datasetContributions, months: lastNMonths('2026-09', 3), startDay: 1 } },
      { name: 'lastNMonths(2026-09, 3), startDay 26', input: { contributions: datasetContributions, months: lastNMonths('2026-09', 3), startDay: 26 } },
      { name: 'no months', input: { contributions: datasetContributions, months: [], startDay: 1 } },
    ] as { name: string; input: AverageMonthlyContributionInput }[],
    impl: (input: AverageMonthlyContributionInput) => {
      setActivePeriodStartDay(input.startDay)
      return averageMonthlyContribution(input.contributions, input.months)
    },
  },
  budgetStatus: {
    cases: [0, 0.5, 0.79, 0.8, 0.99, 1, 1.5].map((fraction) => ({ name: `fraction ${fraction}`, input: { fraction } })) as { name: string; input: FractionInput }[],
    impl: (input: FractionInput) => budgetStatus(input.fraction),
  },
  periodContributions: {
    cases: [1, 26].map((startDay) => ({
      name: `2026-08, startDay ${startDay}`,
      input: { contributions: datasetContributions, periodKey: '2026-08', startDay },
    })) as { name: string; input: PeriodContributionsInput }[],
    impl: async (input: PeriodContributionsInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedContributions(input.contributions)
      return getPeriodContributions(input.periodKey)
    },
  },
  balanceUpToPeriodCents: {
    cases: [
      ...MONTHS_2026_05_TO_09.map((periodKey) => ({
        name: `${periodKey}, startDay 1`,
        input: { transactions: datasetTransactions, contributions: datasetContributions, periodKey, startDay: 1 },
      })),
      { name: '2026-09, startDay 26', input: { transactions: datasetTransactions, contributions: datasetContributions, periodKey: '2026-09', startDay: 26 } },
    ] as { name: string; input: BalanceUpToPeriodInput }[],
    impl: async (input: BalanceUpToPeriodInput) => {
      setActivePeriodStartDay(input.startDay)
      await seedTransactions(input.transactions)
      await seedContributions(input.contributions)
      return balanceUpToPeriodCents(input.periodKey)
    },
  },
  computePace: {
    cases: [
      [0.5, 0.5],
      [0.7, 0.5],
      [0.58, 0.5],
      [0.3, 0.5],
      [0.34, 0.5],
      [0.69, 0.5],
      [1, 0.2],
      [0, 1],
    ].map(([spentFraction, elapsedFraction]) => ({
      name: `spent ${spentFraction}, elapsed ${elapsedFraction}`,
      input: { spentFraction, elapsedFraction },
    })) as { name: string; input: PaceInput }[],
    impl: (input: PaceInput) => computePace(input.spentFraction, input.elapsedFraction),
  },
})
