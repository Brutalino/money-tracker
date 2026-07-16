import { db } from '../db/db'
import type { Transaction, Budget, Contribution } from '../db/types'
import { addMonths, lastNMonths } from './dates'
import { roundToNearest5 } from './money'

export interface MonthTransactions {
  all: Transaction[]
  expenses: Transaction[]
  incomes: Transaction[]
  variableExpenses: Transaction[] // expenses without recurringId
  fixedExpenses: Transaction[] // expenses with recurringId
}

export async function getMonthTransactions(monthKey: string): Promise<MonthTransactions> {
  const all = await db.transactions
    .where('date')
    .between(`${monthKey}-01`, `${monthKey}-31`, true, true)
    .toArray()
  const expenses = all.filter((t) => t.type === 'expense')
  const incomes = all.filter((t) => t.type === 'income')
  const variableExpenses = expenses.filter((t) => !t.recurringId)
  const fixedExpenses = expenses.filter((t) => !!t.recurringId)
  return { all, expenses, incomes, variableExpenses, fixedExpenses }
}

export function sumCents(txs: Transaction[]): number {
  return txs.reduce((sum, t) => sum + t.amountCents, 0)
}

export function groupByCategory(txs: Transaction[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of txs) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountCents)
  }
  return map
}

export async function getBudgetsForMonth(monthKey: string): Promise<Budget[]> {
  return db.budgets.where('month').equals(monthKey).toArray()
}

export interface BudgetProgress {
  categoryId: string
  budgetEuros: number
  spentCents: number
  remainingCents: number
  fraction: number // spent / budget, uncapped
}

/** Total euros budgeted for a month across all categories */
export function sumBudgetEuros(budgets: Budget[]): number {
  return budgets.reduce((sum, b) => sum + b.amountEuros, 0)
}

/**
 * Suggest a budget per expense category based on the average of up to the last
 * 3 full (completed) months of variable spending, rounded to the nearest 5€.
 */
export async function suggestBudgets(
  monthKey: string,
  expenseCategoryIds: string[]
): Promise<Map<string, number>> {
  // "Full months" = months strictly before the current one being budgeted.
  const candidateMonths = lastNMonths(addMonths(monthKey, -1), 3)
  const totals = new Map<string, number>()
  for (const m of candidateMonths) {
    const { variableExpenses } = await getMonthTransactions(m)
    const byCategory = groupByCategory(variableExpenses)
    for (const catId of expenseCategoryIds) {
      const cents = byCategory.get(catId) ?? 0
      totals.set(catId, (totals.get(catId) ?? 0) + cents)
    }
  }
  const result = new Map<string, number>()
  for (const catId of expenseCategoryIds) {
    const totalCents = totals.get(catId) ?? 0
    const avgEuros = totalCents / 100 / candidateMonths.length
    result.set(catId, roundToNearest5(avgEuros))
  }
  return result
}

/** Average monthly contribution to a goal over the last N months (from contributions list) */
export function averageMonthlyContribution(contributions: Contribution[], months: string[]): number {
  if (months.length === 0) return 0
  const monthSet = new Set(months)
  const total = contributions
    .filter((c) => monthSet.has(c.date.slice(0, 7)))
    .reduce((sum, c) => sum + c.amountCents, 0)
  return total / months.length
}

export type PaceStatus = 'good' | 'warning' | 'critical'

export function budgetStatus(fraction: number): PaceStatus {
  if (fraction >= 1) return 'critical'
  if (fraction >= 0.8) return 'warning'
  return 'good'
}

export async function goalSavedCents(goalId: string): Promise<number> {
  const contributions = await db.contributions.where('goalId').equals(goalId).toArray()
  return sumContributionCents(contributions)
}

export function sumContributionCents(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amountCents, 0)
}

export interface PaceInfo {
  spentFraction: number
  elapsedFraction: number
  status: PaceStatus
  message: string
}

export function computePace(spentFraction: number, elapsedFraction: number): PaceInfo {
  const diff = spentFraction - elapsedFraction
  let status: PaceStatus = 'good'
  let message = 'Sei in linea 👌'
  if (diff > 0.18) {
    status = 'critical'
    message = 'Stai correndo troppo, rallenta 🚨'
  } else if (diff > 0.07) {
    status = 'warning'
    message = 'Stai correndo un po\' troppo ⚠️'
  } else if (diff < -0.15) {
    status = 'good'
    message = 'Vai piano, sei molto avanti 🙂'
  }
  return { spentFraction, elapsedFraction, status, message }
}
