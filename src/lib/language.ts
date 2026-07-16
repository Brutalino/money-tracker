import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import type { Language } from '../db/types'
import { DEFAULT_LANGUAGE } from './locale'

export async function getStoredLanguage(): Promise<Language> {
  const rec = await db.settings.get(SETTINGS_KEYS.language)
  const value = rec?.value
  if (value === 'en' || value === 'it') return value
  return DEFAULT_LANGUAGE
}

export async function setStoredLanguage(lang: Language): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.language, value: lang })
}
