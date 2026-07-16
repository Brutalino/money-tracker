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
    // v2: add a compound [recurringId+date] index so the recurring materializer can
    // look up "does this month already have a materialized transaction?" in O(1) and
    // so the one-time dedupe migration can scan efficiently. Not marked unique (`&`)
    // because recurringId is undefined for manual transactions and Dexie/IndexedDB
    // would still index those `undefined` compound entries inconsistently across
    // browsers; real duplicate-prevention instead comes from a deterministic
    // primary key (see makeRecurringTxId in lib/recurring.ts), which IndexedDB
    // always enforces as unique regardless of nullability of other fields.
    this.version(2).stores({
      transactions: 'id, type, categoryId, date, recurringId, [recurringId+date]',
      categories: 'id, kind, archived, sortOrder',
      recurring: 'id, active, categoryId',
      budgets: 'id, month, categoryId, [month+categoryId]',
      goals: 'id, archived, sortOrder',
      contributions: 'id, goalId, date',
      settings: 'key',
    })
    // v3 (0.4.0): "smart budget with savings target". Category gains optional
    // `flexibility`/`habit` fields and a `savings-plan` row is added to
    // `settings` — neither needs an index (never queried by), so the store
    // definitions are unchanged; the version bump exists purely so Dexie
    // records the schema change and so `package.json`'s version and
    // Diagnostica stay meaningful proof of which build is running.
    this.version(3).stores({
      transactions: 'id, type, categoryId, date, recurringId, [recurringId+date]',
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
