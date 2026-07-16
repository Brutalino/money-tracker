import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../db/types'
import { getStoredLanguage, setStoredLanguage } from '../lib/language'
import { setActiveLanguage } from '../lib/locale'
import { en } from './en'
import { it } from './it'
import type { TranslationKeys } from './types'

const DICTIONARIES: Record<Language, TranslationKeys> = { en, it }

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getStoredLanguage().then((lang) => {
      if (cancelled) return
      setLanguageState(lang)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the module-level "active language" mirror (read by pure lib functions
  // that can't consume React context, e.g. formatCents/monthLabel) in sync.
  // Set synchronously during render — before descendants render — rather than
  // in an effect, so the very first paint after a language change already
  // uses the right locale everywhere, with no flash of stale formatting.
  setActiveLanguage(language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    setStoredLanguage(lang).catch(() => {})
  }

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: DICTIONARIES[language] }),
    [language]
  )

  // Hold off rendering children until the stored preference (if any) has been
  // read, so the app never flashes the default language before flipping to a
  // saved one. This mirrors App.tsx's own "ready" gate for seeding/theme.
  if (!ready) return null

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): TranslationKeys {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within an I18nProvider')
  return ctx.t
}

export function useLanguage(): { language: Language; setLanguage: (lang: Language) => void } {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useLanguage must be used within an I18nProvider')
  return { language: ctx.language, setLanguage: ctx.setLanguage }
}
