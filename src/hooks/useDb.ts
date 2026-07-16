import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category } from '../db/types'

export function useCategories(kind?: 'expense' | 'income', includeArchived = false) {
  return useLiveQuery(async () => {
    let all = await db.categories.toArray()
    if (kind) all = all.filter((c) => c.kind === kind)
    if (!includeArchived) all = all.filter((c) => !c.archived)
    return all.sort((a, b) => a.sortOrder - b.sortOrder)
  }, [kind, includeArchived])
}

export function useAllCategoriesMap() {
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const map = new Map<string, Category>()
  categories?.forEach((c) => map.set(c.id, c))
  return map
}

export function useRecurring(activeOnly = false) {
  return useLiveQuery(async () => {
    const all = await db.recurring.toArray()
    return activeOnly ? all.filter((r) => r.active) : all
  }, [activeOnly])
}

export function useGoals(includeArchived = false) {
  return useLiveQuery(async () => {
    const all = await db.goals.toArray()
    const filtered = includeArchived ? all : all.filter((g) => !g.archived)
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder)
  }, [includeArchived])
}
