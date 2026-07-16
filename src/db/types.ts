export type TransactionType = 'expense' | 'income'
export type RecurringFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'annual'

export interface Transaction {
  id: string
  amountCents: number
  type: TransactionType
  categoryId: string
  date: string // ISO yyyy-mm-dd
  note?: string
  recurringId?: string
}

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  kind: TransactionType
  sortOrder: number
  archived: boolean
}

export interface Recurring {
  id: string
  name: string
  amountCents: number
  categoryId: string
  type: TransactionType
  frequency: RecurringFrequency
  active: boolean
  createdMonth: string // yyyy-mm, first month this item existed (for materialization backfill)
}

export interface Budget {
  id: string
  month: string // yyyy-mm
  categoryId: string
  amountEuros: number // integer euros
}

export interface Goal {
  id: string
  name: string
  emoji: string
  targetCents: number
  deadline?: string // yyyy-mm
  archived: boolean
  sortOrder: number
}

export interface Contribution {
  id: string
  goalId: string
  amountCents: number
  date: string // ISO yyyy-mm-dd
  note?: string
}

export type ThemeMode = 'auto' | 'light' | 'dark'

export interface SettingsRecord {
  key: string
  value: unknown
}

export const SETTINGS_KEYS = {
  theme: 'theme',
  onboardingDone: 'onboarding-done',
  lastMaterializedMonth: 'last-materialized-month',
} as const
