import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import type { SavingsPlan } from '../db/types'

export async function getSavingsPlan(): Promise<SavingsPlan | null> {
  const rec = await db.settings.get(SETTINGS_KEYS.savingsPlan)
  const value = rec?.value as SavingsPlan | undefined
  if (!value || typeof value.amountEuros !== 'number' || value.amountEuros <= 0) return null
  return value
}

export async function setSavingsPlan(plan: SavingsPlan): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.savingsPlan, value: plan })
}
