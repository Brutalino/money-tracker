import { db } from '../db/db'
import { SETTINGS_KEYS } from '../db/types'
import type { Language } from '../db/types'

export interface ChangelogEntry {
  /** Feature version family shown to the user, e.g. '0.8'. */
  version: string
  /** Full app version that last added or changed items here; drives popup visibility. */
  updatedIn: string
  /** One short line per user-visible change, in every supported language. */
  items: Record<Language, string[]>
}

// One entry per feature version ('0.8'). A new minor gets a new entry; a
// patch release with user-visible changes updates that minor's items and
// bumps updatedIn so the full entry is shown again to anyone who hasn't
// seen the latest revision. A release that changes nothing user-visible
// leaves updatedIn alone and shows no popup.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.12',
    updatedIn: '0.12.0',
    items: {
      en: [
        'The Home now opens with a big number: the money you have left this month',
        'Your budget shows underneath it as a slim progress bar',
      ],
      it: [
        'La Home ora si apre con un numero in grande: i soldi che ti rimangono questo mese',
        'Il budget compare sotto come barra di avanzamento sottile',
      ],
    },
  },
  {
    version: '0.11',
    updatedIn: '0.11.0',
    items: {
      en: ['Delete unused categories from Settings'],
      it: ['Elimina le categorie non usate dalle Impostazioni'],
    },
  },
  {
    version: '0.10',
    updatedIn: '0.10.2',
    items: {
      en: [
        'Choose when a recurring cost starts: this month or the next one',
        'Fixed the month selector touching the fixed costs bar in Expenses',
      ],
      it: [
        'Scegli quando parte un costo ricorrente: questo mese o il prossimo',
        'Corretto il selettore del mese che toccava la barra dei costi fissi in Spese',
      ],
    },
  },
  {
    version: '0.9',
    updatedIn: '0.9.0',
    items: {
      en: [
        'Smoother animations: panels now glide away when closed and switching section fades in gently',
        "Animations respect your device's Reduce Motion setting",
      ],
      it: [
        'Animazioni più fluide: i pannelli ora scivolano via alla chiusura e il cambio di sezione sfuma dolcemente',
        "Le animazioni rispettano l'impostazione Riduci movimento del dispositivo",
      ],
    },
  },
  {
    version: '0.8',
    updatedIn: '0.8.1',
    items: {
      en: [
        'You can now send feedback from Settings, anonymously and straight from the app.',
        'The feedback sheet opens full screen, so the keyboard never pushes it off the screen.',
      ],
      it: [
        "Ora puoi inviare un feedback dalle Impostazioni, in modo anonimo e direttamente dall'app.",
        'Il foglio del feedback si apre a schermo intero, così la tastiera non lo spinge mai fuori dallo schermo.',
      ],
    },
  },
  {
    version: '0.7',
    updatedIn: '0.7.0',
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
    version: '0.6',
    updatedIn: '0.6.0',
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
  const sorted = [...CHANGELOG].sort((a, b) => compareVersions(b.updatedIn, a.updatedIn))
  // Drop notes for versions not yet released in the running bundle (can
  // happen if CHANGELOG gets ahead of package.json during development).
  const released = sorted.filter((entry) => compareVersions(entry.updatedIn, currentVersion) <= 0)

  if (lastSeenVersion === null) {
    // A user who never saw the popup before (fresh flag, existing install)
    // shouldn't be dumped the entire history, just the latest entry.
    return released.slice(0, 1)
  }

  const unseen = released.filter((entry) => compareVersions(entry.updatedIn, lastSeenVersion) > 0)
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
