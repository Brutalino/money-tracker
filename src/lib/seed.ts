import { db } from '../db/db'
import { makeId } from './id'
import type { Category } from '../db/types'
import { SETTINGS_KEYS } from '../db/types'

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

const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<Category, 'name' | 'emoji'>> = [
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
]

const DEFAULT_INCOME_CATEGORIES: Array<Pick<Category, 'name' | 'emoji'>> = [
  { name: 'Stipendio', emoji: '💼' },
  { name: 'Altre entrate', emoji: '➕' },
]

export async function ensureSeeded(): Promise<void> {
  // Wrap the check-then-insert in a single readwrite transaction so two
  // concurrent calls (e.g. React StrictMode's double effect invocation in
  // dev) can never both observe count === 0 and double-seed the table.
  await db.transaction('rw', db.categories, db.settings, async () => {
    const count = await db.categories.count()
    if (count > 0) return

    const categories: Category[] = []
    DEFAULT_EXPENSE_CATEGORIES.forEach((c, i) => {
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
    DEFAULT_INCOME_CATEGORIES.forEach((c, i) => {
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
