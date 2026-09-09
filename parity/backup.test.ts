import { parityModule } from './harness'
import { isValidBackup } from '../src/lib/backup'

/** Deep clone via JSON round-trip — every fixture value here is already
 * JSON-serializable, which is the whole point of a backup payload. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * A realistic, fully valid backup: 2 expense categories (with differing
 * flexibility/habit) + 1 income category, 1 recurring item with its
 * materialized transaction, 3 transactions total, 2 budgets, 1 goal with a
 * deadline + 1 without, 2 contributions, and settings rows covering
 * theme/language/period-start-day/savings-plan.
 */
function baseBackup(): Record<string, unknown> {
  return {
    version: 1,
    exportedAt: '2026-09-08T12:00:00.000Z',
    categories: [
      {
        id: 'cat-groceries',
        name: 'Groceries',
        emoji: '🛒',
        color: '#4CAF50',
        kind: 'expense',
        sortOrder: 0,
        archived: false,
        flexibility: 'flexible',
      },
      {
        id: 'cat-smoking',
        name: 'Smoking',
        emoji: '🚬',
        color: '#9E9E9E',
        kind: 'expense',
        sortOrder: 1,
        archived: false,
        flexibility: 'veryFlexible',
        habit: true,
      },
      {
        id: 'cat-salary',
        name: 'Salary',
        emoji: '💰',
        color: '#2196F3',
        kind: 'income',
        sortOrder: 0,
        archived: false,
      },
    ],
    goals: [
      {
        id: 'goal-vacation',
        name: 'Vacation',
        emoji: '🏖️',
        targetCents: 200000,
        deadline: '2026-12',
        archived: false,
        sortOrder: 0,
      },
      {
        id: 'goal-emergency',
        name: 'Emergency fund',
        emoji: '🛟',
        targetCents: 500000,
        archived: false,
        sortOrder: 1,
      },
    ],
    recurring: [
      {
        id: 'streaming',
        name: 'Streaming subscription',
        amountCents: 1299,
        categoryId: 'cat-groceries',
        type: 'expense',
        frequency: 'monthly',
        active: true,
        createdMonth: '2026-01',
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        amountCents: 4500,
        type: 'expense',
        categoryId: 'cat-groceries',
        date: '2026-09-03',
        note: 'Weekly shop',
      },
      {
        id: 'tx-2',
        amountCents: 250000,
        type: 'income',
        categoryId: 'cat-salary',
        date: '2026-09-01',
      },
      {
        id: 'rec-streaming-2026-09',
        amountCents: 1299,
        type: 'expense',
        categoryId: 'cat-groceries',
        date: '2026-09-01',
        recurringId: 'streaming',
      },
    ],
    budgets: [
      { id: 'budget-1', month: '2026-09', categoryId: 'cat-groceries', amountEuros: 400 },
      { id: 'budget-2', month: '2026-09', categoryId: 'cat-smoking', amountEuros: 50 },
    ],
    contributions: [
      { id: 'contrib-1', goalId: 'goal-vacation', amountCents: 10000, date: '2026-09-05', note: 'Bonus' },
      { id: 'contrib-2', goalId: 'goal-emergency', amountCents: 20000, date: '2026-09-06' },
    ],
    settings: [
      { key: 'theme', value: 'dark' },
      { key: 'language', value: 'en' },
      { key: 'period-start-day', value: 5 },
      { key: 'savings-plan', value: { amountEuros: 300, goalId: 'goal-vacation', motivation: 'Trip fund' } },
    ],
  }
}

interface BackupCase {
  name: string
  input: { data: unknown }
}

const cases: BackupCase[] = []

function addCase(name: string, mutate: (b: Record<string, unknown>) => void): void {
  const b = clone(baseBackup())
  mutate(b)
  cases.push({ name, input: { data: b } })
}

const REQUIRED_TABLES = ['transactions', 'categories', 'recurring', 'budgets', 'goals', 'contributions']

// --- Whole-payload shape ---------------------------------------------------

cases.push({ name: 'valid: full backup', input: { data: baseBackup() } })
addCase('valid: without settings table', (b) => {
  delete b.settings
})
addCase('invalid: settings not an array', (b) => {
  b.settings = { key: 'theme', value: 'dark' }
})

for (const table of REQUIRED_TABLES) {
  addCase(`invalid: missing ${table} table`, (b) => {
    delete b[table]
  })
}
for (const table of REQUIRED_TABLES) {
  addCase(`invalid: ${table} not an array`, (b) => {
    b[table] = 'not-an-array'
  })
}

// --- Category ---------------------------------------------------------------

addCase('invalid: category missing name', (b) => {
  delete (b.categories as Record<string, unknown>[])[0].name
})
addCase('invalid: category empty name', (b) => {
  ;(b.categories as Record<string, unknown>[])[0].name = ''
})
addCase('invalid: category bad kind literal', (b) => {
  ;(b.categories as Record<string, unknown>[])[0].kind = 'transfer'
})
addCase('invalid: category non-boolean archived', (b) => {
  ;(b.categories as Record<string, unknown>[])[0].archived = 'no'
})
addCase('valid: category bad flexibility literal is not validated by isValidBackup', (b) => {
  ;(b.categories as Record<string, unknown>[])[0].flexibility = 'not-a-real-flexibility'
})

// --- Goal --------------------------------------------------------------------

addCase('invalid: goal non-string deadline', (b) => {
  ;(b.goals as Record<string, unknown>[])[0].deadline = 202612
})

// --- Recurring ----------------------------------------------------------------

addCase('invalid: recurring bad frequency literal', (b) => {
  ;(b.recurring as Record<string, unknown>[])[0].frequency = 'weekly'
})
addCase('invalid: recurring unknown categoryId', (b) => {
  ;(b.recurring as Record<string, unknown>[])[0].categoryId = 'does-not-exist'
})

// --- Transaction ---------------------------------------------------------------

addCase('invalid: transaction unknown categoryId', (b) => {
  ;(b.transactions as Record<string, unknown>[])[0].categoryId = 'does-not-exist'
})
// Deleting a fixed cost keeps the transactions it already generated, so a
// recurringId that no longer resolves is a normal state, not corruption.
addCase('valid: transaction recurringId of a deleted fixed cost', (b) => {
  ;(b.transactions as Record<string, unknown>[])[2].recurringId = 'does-not-exist'
})
addCase('valid: transaction recurringId survives an emptied recurring table', (b) => {
  b.recurring = []
})
addCase('invalid: transaction recurringId not a string', (b) => {
  ;(b.transactions as Record<string, unknown>[])[2].recurringId = 42
})
addCase('invalid: transaction bad type literal', (b) => {
  ;(b.transactions as Record<string, unknown>[])[0].type = 'transfer'
})
addCase('invalid: transaction non-string date', (b) => {
  ;(b.transactions as Record<string, unknown>[])[0].date = 20260903
})
addCase('invalid: transaction note not a string', (b) => {
  ;(b.transactions as Record<string, unknown>[])[0].note = 42
})

// --- Budget ----------------------------------------------------------------

addCase('invalid: budget unknown categoryId', (b) => {
  ;(b.budgets as Record<string, unknown>[])[0].categoryId = 'does-not-exist'
})
addCase('invalid: budget amountEuros as string', (b) => {
  ;(b.budgets as Record<string, unknown>[])[0].amountEuros = '400'
})

// --- Contribution ------------------------------------------------------------

addCase('invalid: contribution unknown goalId', (b) => {
  ;(b.contributions as Record<string, unknown>[])[0].goalId = 'does-not-exist'
})

// --- Settings ------------------------------------------------------------------

addCase('invalid: settings record missing key', (b) => {
  delete (b.settings as Record<string, unknown>[])[0].key
})

// --- Top-level shape -----------------------------------------------------------

cases.push({ name: 'invalid: top-level null', input: { data: null } })
cases.push({ name: 'invalid: top-level array', input: { data: [] } })
cases.push({ name: 'invalid: top-level string', input: { data: 'oops' } })

addCase('valid: extra unknown top-level fields are ignored', (b) => {
  b.unknownField = 'surprise'
  b.anotherOne = [1, 2, 3]
})
addCase('valid: version field is not required', (b) => {
  delete b.version
})

await parityModule('backup', {
  isValidBackup: {
    cases,
    impl: (input: { data: unknown }) => isValidBackup(input.data),
  },
})
