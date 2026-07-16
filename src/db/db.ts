import Dexie, { type Table } from 'dexie'
import type {
  Transaction,
  Category,
  Recurring,
  Budget,
  Goal,
  Contribution,
  SettingsRecord,
} from './types'

export class MoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  recurring!: Table<Recurring, string>
  budgets!: Table<Budget, string>
  goals!: Table<Goal, string>
  contributions!: Table<Contribution, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('money-tracker')
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, recurringId',
      categories: 'id, kind, archived, sortOrder',
      recurring: 'id, active, categoryId',
      budgets: 'id, month, categoryId, [month+categoryId]',
      goals: 'id, archived, sortOrder',
      contributions: 'id, goalId, date',
      settings: 'key',
    })
  }
}

export const db = new MoneyDB()
