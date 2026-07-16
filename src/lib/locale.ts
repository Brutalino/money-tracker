// Module-level mirror of the active UI language, for pure (non-React) lib
// functions like formatCents/monthLabel that can't consume React context.
// The i18n context (src/i18n/context.tsx) calls setActiveLanguage synchronously
// during its own render, before any descendant renders, so callers always see
// the language that matches what's on screen.
import type { Language } from '../db/types'

export const DEFAULT_LANGUAGE: Language = 'en'

let activeLanguage: Language = DEFAULT_LANGUAGE

export function setActiveLanguage(lang: Language): void {
  activeLanguage = lang
}

export function getActiveLanguage(): Language {
  return activeLanguage
}

/** BCP-47 tag used for Intl formatting. Both locales use EUR/Ireland-style grouping for English. */
export function localeTag(lang: Language = activeLanguage): string {
  return lang === 'it' ? 'it-IT' : 'en-IE'
}

/** Decimal separator character for keypad/number entry in the given (or active) language. */
export function decimalSeparator(lang: Language = activeLanguage): string {
  return lang === 'it' ? ',' : '.'
}
