import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import type { ThemeMode } from '../db/types'

export async function getStoredTheme(): Promise<ThemeMode> {
  const rec = await db.settings.get(SETTINGS_KEYS.theme)
  const value = rec?.value
  if (value === 'light' || value === 'dark' || value === 'auto') return value
  return 'auto'
}

export async function setStoredTheme(mode: ThemeMode): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.theme, value: mode })
}

export function applyThemeToDocument(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'auto') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}
