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
 *
 * Averages only over months that actually contain at least one variable expense
 * (any category) — dividing by 3 unconditionally would dilute the suggestion by
 * ~3x for new users who only have 1 month of history. If none of the candidate
 * months have any data, returns an empty map (no history to suggest from).
 */
export async function suggestBudgets(
  monthKey: string,
  expenseCategoryIds: string[]
): Promise<Map<string, number>> {
  // "Full months" = months strictly before the current one being budgeted.
  const candidateMonths = lastNMonths(addMonths(monthKey, -1), 3)
  const totals = new Map<string, number>()
  let monthsWithData = 0
  for (const m of candidateMonths) {
    const { variableExpenses } = await getMonthTransactions(m)
    if (variableExpenses.length === 0) continue
    monthsWithData++
    const byCategory = groupByCategory(variableExpenses)
    for (const catId of expenseCategoryIds) {
      const cents = byCategory.get(catId) ?? 0
      totals.set(catId, (totals.get(catId) ?? 0) + cents)
    }
  }
  const result = new Map<string, number>()
  if (monthsWithData === 0) return result
  for (const catId of expenseCategoryIds) {
    const totalCents = totals.get(catId) ?? 0
    const avgEuros = totalCents / 100 / monthsWithData
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

/** Which pace copy to show; distinct from PaceStatus because "good" has two
 * different messages (on-track vs. well-ahead) that share the same status/color. */
export type PaceMessageKey = 'good' | 'critical' | 'warning' | 'wayAhead'

export interface PaceInfo {
  spentFraction: number
  elapsedFraction: number
  status: PaceStatus
  messageKey: PaceMessageKey
}

export function computePace(spentFraction: number, elapsedFraction: number): PaceInfo {
  const diff = spentFraction - elapsedFraction
  let status: PaceStatus = 'good'
  let messageKey: PaceMessageKey = 'good'
  if (diff > 0.18) {
    status = 'critical'
    messageKey = 'critical'
  } else if (diff > 0.07) {
    status = 'warning'
    messageKey = 'warning'
  } else if (diff < -0.15) {
    status = 'good'
    messageKey = 'wayAhead'
  }
  return { spentFraction, elapsedFraction, status, messageKey }
}
