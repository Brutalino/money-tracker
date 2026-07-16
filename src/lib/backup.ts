import { db } from '../db/db'
import type {
  Transaction,
  Category,
  Recurring,
  Budget,
  Goal,
  Contribution,
  SettingsRecord,
} from '../db/types'

export interface BackupPayload {
  version: 1
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  recurring: Recurring[]
  budgets: Budget[]
  goals: Goal[]
  contributions: Contribution[]
  settings: SettingsRecord[]
}

export async function buildBackup(): Promise<BackupPayload> {
  const [transactions, categories, recurring, budgets, goals, contributions, settings] =
    await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.recurring.toArray(),
      db.budgets.toArray(),
      db.goals.toArray(),
      db.contributions.toArray(),
      db.settings.toArray(),
    ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    recurring,
    budgets,
    goals,
    contributions,
    settings,
  }
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportJSON(): Promise<void> {
  const backup = await buildBackup()
  const date = new Date().toISOString().slice(0, 10)
  downloadFile(`money-tracker-backup-${date}.json`, JSON.stringify(backup, null, 2), 'application/json')
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportCSV(): Promise<void> {
  const [transactions, categories] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.categories.toArray(),
  ])
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const header = ['data', 'tipo', 'categoria', 'importo', 'nota', 'ricorrente']
  const rows = transactions.map((t) => {
    const cat = categoryById.get(t.categoryId)
    return [
      t.date,
      t.type === 'expense' ? 'uscita' : 'entrata',
      cat ? `${cat.emoji} ${cat.name}` : t.categoryId,
      (t.amountCents / 100).toFixed(2).replace('.', ','),
      t.note ?? '',
      t.recurringId ? 'si' : 'no',
    ]
  })
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadFile(`money-tracker-transazioni-${date}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/
const TRANSACTION_TYPES = new Set(['expense', 'income'])
const RECURRING_FREQUENCIES = new Set(['monthly', 'bimonthly', 'quarterly', 'annual'])

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object'
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}
function isOptionalString(v: unknown): boolean {
  return v === undefined || typeof v === 'string'
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

function isValidCategory(v: unknown): v is Category {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isNonEmptyString(v.emoji) &&
    isNonEmptyString(v.color) &&
    TRANSACTION_TYPES.has(v.kind as string) &&
    isFiniteNumber(v.sortOrder) &&
    isBoolean(v.archived)
  )
}

function isValidGoal(v: unknown): v is Goal {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isNonEmptyString(v.emoji) &&
    isFiniteNumber(v.targetCents) &&
    (v.deadline === undefined || (typeof v.deadline === 'string' && MONTH_RE.test(v.deadline))) &&
    isBoolean(v.archived) &&
    isFiniteNumber(v.sortOrder)
  )
}

function isValidRecurring(v: unknown, categoryIds: Set<string>): v is Recurring {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isFiniteNumber(v.amountCents) &&
    isNonEmptyString(v.categoryId) &&
    categoryIds.has(v.categoryId) &&
    TRANSACTION_TYPES.has(v.type as string) &&
    RECURRING_FREQUENCIES.has(v.frequency as string) &&
    isBoolean(v.active) &&
    typeof v.createdMonth === 'string' &&
    MONTH_RE.test(v.createdMonth)
  )
}

function isValidTransaction(
  v: unknown,
  categoryIds: Set<string>,
  recurringIds: Set<string>
): v is Transaction {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    isFiniteNumber(v.amountCents) &&
    TRANSACTION_TYPES.has(v.type as string) &&
    isNonEmptyString(v.categoryId) &&
    categoryIds.has(v.categoryId) &&
    typeof v.date === 'string' &&
    DATE_RE.test(v.date) &&
    isOptionalString(v.note) &&
    (v.recurringId === undefined || (typeof v.recurringId === 'string' && recurringIds.has(v.recurringId)))
  )
}

function isValidBudget(v: unknown, categoryIds: Set<string>): v is Budget {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    typeof v.month === 'string' &&
    MONTH_RE.test(v.month) &&
    isNonEmptyString(v.categoryId) &&
    categoryIds.has(v.categoryId) &&
    isFiniteNumber(v.amountEuros)
  )
}

function isValidContribution(v: unknown, goalIds: Set<string>): v is Contribution {
  if (!isRecord(v)) return false
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.goalId) &&
    goalIds.has(v.goalId) &&
    isFiniteNumber(v.amountCents) &&
    typeof v.date === 'string' &&
    DATE_RE.test(v.date) &&
    isOptionalString(v.note)
  )
}

function isValidSettingsRecord(v: unknown): v is SettingsRecord {
  return isRecord(v) && isNonEmptyString(v.key) && 'value' in v
}

/**
 * Validates the overall shape AND the per-record field types/foreign keys of a
 * backup file before it's allowed to replace all local data. Rejects the whole
 * file (existing error path in the caller) if any single record fails — a
 * corrupted or hand-edited backup should never partially import.
 */
export function isValidBackup(data: unknown): data is BackupPayload {
  if (!isRecord(data)) return false

  if (
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.recurring) ||
    !Array.isArray(data.budgets) ||
    !Array.isArray(data.goals) ||
    !Array.isArray(data.contributions)
  ) {
    return false
  }
  if (data.settings !== undefined && !Array.isArray(data.settings)) return false

  if (!data.categories.every(isValidCategory)) return false
  if (!data.goals.every(isValidGoal)) return false

  const categoryIds = new Set((data.categories as Category[]).map((c) => c.id))
  const goalIds = new Set((data.goals as Goal[]).map((g) => g.id))

  if (!data.recurring.every((r) => isValidRecurring(r, categoryIds))) return false
  const recurringIds = new Set((data.recurring as Recurring[]).map((r) => r.id))

  if (!data.transactions.every((t) => isValidTransaction(t, categoryIds, recurringIds))) return false
  if (!data.budgets.every((b) => isValidBudget(b, categoryIds))) return false
  if (!data.contributions.every((c) => isValidContribution(c, goalIds))) return false
  if (data.settings && !(data.settings as unknown[]).every(isValidSettingsRecord)) return false

  return true
}

/** Replaces ALL local data with the contents of the backup. */
export async function importBackup(payload: BackupPayload): Promise<void> {
  await db.transaction(
    'rw',
    [db.transactions, db.categories, db.recurring, db.budgets, db.goals, db.contributions, db.settings],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.recurring.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.contributions.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.transactions.bulkAdd(payload.transactions),
        db.categories.bulkAdd(payload.categories),
        db.recurring.bulkAdd(payload.recurring),
        db.budgets.bulkAdd(payload.budgets),
        db.goals.bulkAdd(payload.goals),
        db.contributions.bulkAdd(payload.contributions),
        payload.settings ? db.settings.bulkAdd(payload.settings) : Promise.resolve(),
      ])
    }
  )
}

export async function deleteAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.transactions, db.categories, db.recurring, db.budgets, db.goals, db.contributions, db.settings],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.recurring.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.contributions.clear(),
        db.settings.clear(),
      ])
    }
  )
}
