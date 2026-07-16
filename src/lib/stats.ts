import { db } from '../db/db'
import type { Transaction, Budget, Contribution } from '../db/types'
import { addMonths, lastNMonths } from './dates'
import { roundToNearest5 } from './money'
import { monthlyEquivalentCents } from './recurring'

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

export interface VariableSpendingAverages {
  /** Pre-rounding average variable spending per category, in cents. */
  averagesCents: Map<string, number>
  monthsWithData: number
}

/**
 * Average variable (non-recurring) spending per category over up to the last
 * 3 full (completed) months, in cents and *before* rounding to the nearest
 * 5€ — the shared basis for both `suggestBudgets` (the "from my habits"
 * suggestion) and the smart-budget savings-target flow's per-category
 * baseline.
 *
 * Averages only over months that actually contain at least one variable
 * expense (any category) — dividing by 3 unconditionally would dilute the
 * suggestion by ~3x for new users who only have 1 month of history.
 */
export async function variableSpendingAverages(
  monthKey: string,
  expenseCategoryIds: string[]
): Promise<VariableSpendingAverages> {
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
  const averagesCents = new Map<string, number>()
  if (monthsWithData === 0) return { averagesCents, monthsWithData }
  for (const catId of expenseCategoryIds) {
    const totalCents = totals.get(catId) ?? 0
    averagesCents.set(catId, totalCents / monthsWithData)
  }
  return { averagesCents, monthsWithData }
}

/**
 * Suggest a budget per expense category based on the average of up to the last
 * 3 full (completed) months of variable spending, rounded to the nearest 5€.
 * If none of the candidate months have any data, returns an empty map (no
 * history to suggest from).
 */
export async function suggestBudgets(
  monthKey: string,
  expenseCategoryIds: string[]
): Promise<Map<string, number>> {
  const { averagesCents, monthsWithData } = await variableSpendingAverages(monthKey, expenseCategoryIds)
  const result = new Map<string, number>()
  if (monthsWithData === 0) return result
  for (const catId of expenseCategoryIds) {
    const cents = averagesCents.get(catId) ?? 0
    result.set(catId, roundToNearest5(cents / 100))
  }
  return result
}

/**
 * Sum of monthly-equivalent amounts of all *active* recurring items, split
 * by type. Used by the smart-budget truth check as the "current" income and
 * fixed-costs figures (as opposed to historical actuals, which can include
 * items that have since been paused/deleted).
 */
export async function activeRecurringMonthlyTotals(): Promise<{ incomeCents: number; expenseCents: number }> {
  const items = (await db.recurring.toArray()).filter((r) => r.active)
  let incomeCents = 0
  let expenseCents = 0
  for (const r of items) {
    const monthly = monthlyEquivalentCents(r.amountCents, r.frequency)
    if (r.type === 'income') incomeCents += monthly
    else expenseCents += monthly
  }
  return { incomeCents, expenseCents }
}

/**
 * Fallback for the smart-budget truth check when there's no active recurring
 * income: average total income over up to the last 3 full months that
 * actually have income transactions. Returns 0 if none.
 */
export async function averageMonthlyIncomeCents(monthKey: string): Promise<number> {
  const candidateMonths = lastNMonths(addMonths(monthKey, -1), 3)
  let total = 0
  let monthsWithData = 0
  for (const m of candidateMonths) {
    const { incomes } = await getMonthTransactions(m)
    if (incomes.length === 0) continue
    monthsWithData++
    total += sumCents(incomes)
  }
  return monthsWithData > 0 ? Math.round(total / monthsWithData) : 0
}

/**
 * Average monthly spending in a single category over up to the last 3 full
 * months that have data *for that category*, in cents. Used for the smart
 * budget's habit ("vice") insight card, where `useAllExpenses = true` so the
 * figure includes any recurring item materialized in that category (e.g. a
 * "Cigarettes" fixed cost), matching "monthly average incl. any recurring
 * items in that category" from the spec — unlike the variable-only baseline
 * used for the cut proposal itself.
 */
export async function categoryMonthlyAverageCents(
  categoryId: string,
  uptoMonthKey: string,
  useAllExpenses: boolean
): Promise<number> {
  const candidateMonths = lastNMonths(addMonths(uptoMonthKey, -1), 3)
  let total = 0
  let monthsWithData = 0
  for (const m of candidateMonths) {
    const { expenses, variableExpenses } = await getMonthTransactions(m)
    const source = useAllExpenses ? expenses : variableExpenses
    const cents = source.filter((t) => t.categoryId === categoryId).reduce((sum, t) => sum + t.amountCents, 0)
    if (cents > 0) {
      total += cents
      monthsWithData++
    }
  }
  return monthsWithData > 0 ? Math.round(total / monthsWithData) : 0
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
