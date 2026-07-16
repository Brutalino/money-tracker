import { db } from '../db/db'
import { makeId } from './id'
import type { Category, Flexibility, Language } from '../db/types'
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

type SeedCategory = Pick<Category, 'name' | 'emoji'> & { flexibility: Flexibility }

// Default flexibility per seeded expense category, same order/meaning in
// both languages: groceries/health/home&bills are essential (won't be cut
// by the smart budget), transport/subscriptions/gifts/other are flexible,
// eating out/shopping/fun are the first to be cut.
const DEFAULT_EXPENSE_CATEGORIES: Record<Language, SeedCategory[]> = {
  en: [
    { name: 'Groceries', emoji: '🛒', flexibility: 'essential' },
    { name: 'Eating out', emoji: '🍕', flexibility: 'veryFlexible' },
    { name: 'Transport', emoji: '⛽', flexibility: 'flexible' },
    { name: 'Home & bills', emoji: '🏠', flexibility: 'essential' },
    { name: 'Subscriptions', emoji: '📱', flexibility: 'flexible' },
    { name: 'Shopping', emoji: '👕', flexibility: 'veryFlexible' },
    { name: 'Fun', emoji: '🎉', flexibility: 'veryFlexible' },
    { name: 'Health', emoji: '💊', flexibility: 'essential' },
    { name: 'Gifts', emoji: '🎁', flexibility: 'flexible' },
    { name: 'Other', emoji: '❓', flexibility: 'flexible' },
  ],
  it: [
    { name: 'Spesa', emoji: '🛒', flexibility: 'essential' },
    { name: 'Mangiare fuori', emoji: '🍕', flexibility: 'veryFlexible' },
    { name: 'Trasporti', emoji: '⛽', flexibility: 'flexible' },
    { name: 'Casa e bollette', emoji: '🏠', flexibility: 'essential' },
    { name: 'Abbonamenti', emoji: '📱', flexibility: 'flexible' },
    { name: 'Shopping', emoji: '👕', flexibility: 'veryFlexible' },
    { name: 'Svago', emoji: '🎉', flexibility: 'veryFlexible' },
    { name: 'Salute', emoji: '💊', flexibility: 'essential' },
    { name: 'Regali', emoji: '🎁', flexibility: 'flexible' },
    { name: 'Altro', emoji: '❓', flexibility: 'flexible' },
  ],
}

type PlainSeedCategory = Pick<Category, 'name' | 'emoji'>

const DEFAULT_INCOME_CATEGORIES: Record<Language, PlainSeedCategory[]> = {
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
        flexibility: c.flexibility,
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
