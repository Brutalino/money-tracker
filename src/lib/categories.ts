import { db } from '../db/db'

/**
 * A category is only deletable when nothing references it: no transaction and
 * no recurring item (active or paused) points at it, otherwise deleting it
 * would orphan those rows and corrupt Report grouping and budget totals.
 * Archiving (see `categories.archived`) is the path for in-use categories
 * that should be hidden without losing history.
 */
export async function deleteCategoryIfUnused(categoryId: string): Promise<'deleted' | 'in-use'> {
  return db.transaction('rw', db.transactions, db.recurring, db.budgets, db.categories, async () => {
    const [txCount, recurringCount] = await Promise.all([
      db.transactions.where('categoryId').equals(categoryId).count(),
      db.recurring.where('categoryId').equals(categoryId).count(),
    ])

    if (txCount > 0 || recurringCount > 0) return 'in-use'

    await db.budgets.where('categoryId').equals(categoryId).delete()
    await db.categories.delete(categoryId)
    return 'deleted'
  })
}
