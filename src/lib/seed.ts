import { db } from '../db/db'
import { makeId } from './id'
import type { Category, Language } from '../db/types'
import { SETTINGS_KEYS } from '../db/types'
import { getStoredLanguage } from './language'

// Categorical palette (from dataviz skill reference), fixed hue order.
const PALETTE = [
  '#2a78d6', // blue
  '#008300', // green
  '#e87ba4', // magenta
  '#eda100', // yellow
  '#1baf7a', // aqua
  '#eb6834', // orange
  '#4a3aa7', // violet
  '#e34948', // red
]

type SeedCategory = Pick<Category, 'name' | 'emoji'>

const DEFAULT_EXPENSE_CATEGORIES: Record<Language, SeedCategory[]> = {
  en: [
    { name: 'Groceries', emoji: '🛒' },
    { name: 'Eating out', emoji: '🍕' },
    { name: 'Transport', emoji: '⛽' },
    { name: 'Home & bills', emoji: '🏠' },
    { name: 'Subscriptions', emoji: '📱' },
    { name: 'Shopping', emoji: '👕' },
    { name: 'Fun', emoji: '🎉' },
    { name: 'Health', emoji: '💊' },
    { name: 'Gifts', emoji: '🎁' },
    { name: 'Other', emoji: '❓' },
  ],
  it: [
    { name: 'Spesa', emoji: '🛒' },
    { name: 'Mangiare fuori', emoji: '🍕' },
    { name: 'Trasporti', emoji: '⛽' },
    { name: 'Casa e bollette', emoji: '🏠' },
    { name: 'Abbonamenti', emoji: '📱' },
    { name: 'Shopping', emoji: '👕' },
    { name: 'Svago', emoji: '🎉' },
    { name: 'Salute', emoji: '💊' },
    { name: 'Regali', emoji: '🎁' },
    { name: 'Altro', emoji: '❓' },
  ],
}

const DEFAULT_INCOME_CATEGORIES: Record<Language, SeedCategory[]> = {
  en: [
    { name: 'Salary', emoji: '💼' },
    { name: 'Other income', emoji: '➕' },
  ],
  it: [
    { name: 'Stipendio', emoji: '💼' },
    { name: 'Altre entrate', emoji: '➕' },
  ],
}

export async function ensureSeeded(): Promise<void> {
  // Wrap the check-then-insert in a single readwrite transaction so two
  // concurrent calls (e.g. React StrictMode's double effect invocation in
  // dev) can never both observe count === 0 and double-seed the table.
  await db.transaction('rw', db.categories, db.settings, async () => {
    const count = await db.categories.count()
    if (count > 0) return

    // Seed in whatever language is active at first run (defaults to English
    // on a fresh install with no stored preference). Existing databases are
    // never touched/renamed by a later language switch.
    const language = await getStoredLanguage()

    const categories: Category[] = []
    DEFAULT_EXPENSE_CATEGORIES[language].forEach((c, i) => {
      categories.push({
        id: makeId(),
        name: c.name,
        emoji: c.emoji,
        color: PALETTE[i % PALETTE.length],
        kind: 'expense',
        sortOrder: i,
        archived: false,
      })
    })
    DEFAULT_INCOME_CATEGORIES[language].forEach((c, i) => {
      categories.push({
        id: makeId(),
        name: c.name,
        emoji: c.emoji,
        color: PALETTE[(i + 2) % PALETTE.length],
        kind: 'income',
        sortOrder: i,
        archived: false,
      })
    })

    await db.categories.bulkAdd(categories)
    await db.settings.put({ key: SETTINGS_KEYS.onboardingDone, value: false })
  })
}
