import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import type { Language } from '../db/types'

export interface ChangelogEntry {
  version: string
  /** One short line per user-visible change, in every supported language. */
  items: Record<Language, string[]>
}

// Add one entry here on every package.json version bump that has
// user-visible changes. A release with no entry simply doesn't show the
// What's new popup.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.8.1',
    items: {
      en: ['The feedback sheet now opens full screen, so the keyboard no longer pushes it off the screen.'],
      it: ['Il foglio del feedback ora si apre a schermo intero, così la tastiera non lo spinge più fuori dallo schermo.'],
    },
  },
  {
    version: '0.8.0',
    items: {
      en: ['You can now send feedback from Settings, anonymously and straight from the app.'],
      it: ["Ora puoi inviare un feedback dalle Impostazioni, in modo anonimo e direttamente dall'app."],
    },
  },
  {
    version: '0.7.0',
    items: {
      en: [
        'Money you set aside for a savings goal now reduces what you can still spend this month.',
        'The monthly leftover in Savings no longer counts money you already set aside.',
      ],
      it: [
        'I soldi che metti da parte per un obiettivo ora riducono quello che puoi ancora spendere nel mese.',
        "L'avanzo del mese in Risparmi non conta più i soldi già messi da parte.",
      ],
    },
  },
  {
    version: '0.6.0',
    items: {
      en: [
        'The app now shows what changed after every update.',
        'Your data and settings are untouched.',
      ],
      it: [
        "Ora l'app ti mostra cosa è cambiato dopo ogni aggiornamento.",
        'I tuoi dati e le impostazioni restano invariati.',
      ],
    },
  },
]

export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.')
  const partsB = b.split('.')
  const length = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < length; i++) {
    const numA = Number.parseInt(partsA[i] ?? '', 10) || 0
    const numB = Number.parseInt(partsB[i] ?? '', 10) || 0
    if (numA !== numB) return numA - numB
  }
  return 0
}

const MAX_ENTRIES = 4

export function changelogToShow(lastSeenVersion: string | null, currentVersion: string): ChangelogEntry[] {
  const sorted = [...CHANGELOG].sort((a, b) => compareVersions(b.version, a.version))
  // Drop notes for versions not yet released in the running bundle (can
  // happen if CHANGELOG gets ahead of package.json during development).
  const released = sorted.filter((entry) => compareVersions(entry.version, currentVersion) <= 0)

  if (lastSeenVersion === null) {
    // A user who never saw the popup before (fresh flag, existing install)
    // shouldn't be dumped the entire history, just the latest entry.
    return released.slice(0, 1)
  }

  const unseen = released.filter((entry) => compareVersions(entry.version, lastSeenVersion) > 0)
  // Cap the sheet length so skipping many releases at once still shows a
  // short list rather than a huge scroll of old notes.
  return unseen.slice(0, MAX_ENTRIES)
}

export async function getLastSeenVersion(): Promise<string | null> {
  const rec = await db.settings.get(SETTINGS_KEYS.lastSeenVersion)
  const value = rec?.value
  return typeof value === 'string' ? value : null
}

export async function setLastSeenVersion(version: string): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEYS.lastSeenVersion, value: version })
}
