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

export type Flexibility = 'essential' | 'flexible' | 'veryFlexible'

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  kind: TransactionType
  sortOrder: number
  archived: boolean
  /** Expense categories only. Undefined on existing rows means 'flexible' —
   * resolve with smartBudget.categoryFlexibility(), never read raw. */
  flexibility?: Flexibility
  /** "Vice" flag (e.g. smoking, drinking): never cut by the smart budget
   * regardless of flexibility, but surfaced as a "quit and save" insight. */
  habit?: boolean
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

export type Language = 'en' | 'it'

export interface SettingsRecord {
  key: string
  value: unknown
}

/** The user's monthly savings plan, set from the Budget screen's "with a
 * savings target" flow. Stored as a single settings row (see
 * SETTINGS_KEYS.savingsPlan) rather than a dedicated table since there is
 * only ever one active plan. */
export interface SavingsPlan {
  amountEuros: number
  goalId?: string
  motivation?: string
}

export const SETTINGS_KEYS = {
  theme: 'theme',
  language: 'language',
  onboardingDone: 'onboarding-done',
  lastMaterializedMonth: 'last-materialized-month',
  savingsPlan: 'savings-plan',
} as const
