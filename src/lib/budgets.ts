import { db } from '../db/db'
import { makeId } from './id'

export async function upsertBudget(month: string, categoryId: string, amountEuros: number): Promise<void> {
  const existing = await db.budgets.where({ month, categoryId }).first()
  if (amountEuros <= 0) {
    if (existing) await db.budgets.delete(existing.id)
    return
  }
  if (existing) {
    await db.budgets.update(existing.id, { amountEuros })
  } else {
    await db.budgets.add({ id: makeId(), month, categoryId, amountEuros })
  }
}

export async function copyBudgetsFromMonth(fromMonth: string, toMonth: string): Promise<void> {
  const source = await db.budgets.where('month').equals(fromMonth).toArray()
  for (const b of source) {
    await upsertBudget(toMonth, b.categoryId, b.amountEuros)
  }
}
