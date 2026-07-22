import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'

export async function getOnboardingDone(): Promise<boolean> {
  const rec = await db.settings.get(SETTINGS_KEYS.onboardingDone)
  return rec?.value === true
}

export async function setOnboardingDone(): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.onboardingDone, value: true })
}
