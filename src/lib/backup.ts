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

export function isValidBackup(data: unknown): data is BackupPayload {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    Array.isArray(d.transactions) &&
    Array.isArray(d.categories) &&
    Array.isArray(d.recurring) &&
    Array.isArray(d.budgets) &&
    Array.isArray(d.goals) &&
    Array.isArray(d.contributions)
  )
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
