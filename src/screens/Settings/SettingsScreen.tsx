import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { IconBack, IconDownload, IconUpload, IconChevronRight, IconBook } from '../../components/Icons'
import { CategoryFormSheet } from './CategoryFormSheet'
import { PeriodStartSheet } from './PeriodStartSheet'
import styles from './SettingsScreen.module.css'
import { db } from '../../db/db'
import { getStoredTheme, setStoredTheme, applyThemeToDocument } from '../../lib/theme'
import { exportJSON, exportCSV, importBackup, isValidBackup, deleteAllData } from '../../lib/backup'
import { ensureSeeded } from '../../lib/seed'
import { collectDiagnostics, type DiagnosticsSnapshot } from '../../lib/diagnostics'
import { useT, useLanguage } from '../../i18n'
import { usePeriodStartDay } from '../../period'
import { setStoredLanguage } from '../../lib/language'
import type { Category, ThemeMode, Language } from '../../db/types'

interface Props {
  onClose: () => void
  onOpenGuide: () => void
}

export function SettingsScreen({ onClose, onOpenGuide }: Props) {
  const t = useT()
  const { language, setLanguage } = useLanguage()
  const { periodStartDay } = usePeriodStartDay()
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null)
  const [categorySheet, setCategorySheet] = useState<{ item: Category | null; kind: 'expense' | 'income' } | null>(
    null
  )
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStoredTheme().then(setThemeMode)
  }, [])

  useEffect(() => {
    function refresh() {
      setDiagnostics(collectDiagnostics())
    }
    refresh()
    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', refresh)
    window.visualViewport?.addEventListener('resize', refresh)
    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('orientationchange', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
    }
  }, [])

  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const expenseCategories = (categories ?? [])
    .filter((c) => c.kind === 'expense')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const incomeCategories = (categories ?? [])
    .filter((c) => c.kind === 'income')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  async function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode)
    await setStoredTheme(mode)
    applyThemeToDocument(mode)
  }

  function handleLanguageChange(lang: Language) {
    setLanguage(lang)
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!isValidBackup(parsed)) {
        alert(t.settings.invalidBackupFile)
        return
      }
      if (!confirm(t.settings.confirmImport)) return
      setBusy(true)
      await importBackup(parsed)
      alert(t.settings.importSuccess)
    } catch {
      alert(t.settings.readFileFailed)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteAll() {
    if (!confirm(t.settings.confirmDeleteAll1)) return
    if (!confirm(t.settings.confirmDeleteAll2)) return
    setBusy(true)
    try {
      await deleteAllData()
      // deleteAllData wipes the settings table too (theme, language, ...), so
      // re-persist the language currently on screen before re-seeding —
      // otherwise the freshly seeded categories would silently fall back to
      // the default language even if the UI is showing Italian.
      await setStoredLanguage(language)
      await ensureSeeded()
      alert(t.settings.deleteAllSuccess)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet variant="full" hideHeader onClose={onClose}>
      <div className={styles.top}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label={t.common.back}>
          <IconBack width={18} height={18} />
        </button>
        <span className={styles.title}>{t.settings.title}</span>
      </div>

      <div className={styles.body}>
        <div className="section-title">{t.settings.guideTitle}</div>
        <div className="card">
          <button type="button" className={styles.catRow} onClick={onOpenGuide}>
            <div className={styles.catEmoji}>
              <IconBook width={16} height={16} />
            </div>
            <span className={styles.catName}>{t.settings.openGuide}</span>
            <IconChevronRight width={16} height={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        </div>

        <div className="section-title">{t.settings.appearance}</div>
        <div className={styles.segmented}>
          {(['auto', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.segBtn} ${themeMode === mode ? styles.segBtnActive : ''}`}
              onClick={() => handleThemeChange(mode)}
            >
              {mode === 'auto' ? t.settings.themeAuto : mode === 'light' ? t.settings.themeLight : t.settings.themeDark}
            </button>
          ))}
        </div>

        <div className="section-title">{t.settings.language}</div>
        <div className={styles.segmented}>
          {(['en', 'it'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              className={`${styles.segBtn} ${language === lang ? styles.segBtnActive : ''}`}
              onClick={() => handleLanguageChange(lang)}
            >
              {lang === 'en' ? `🇬🇧 ${t.settings.languageEnglish}` : `🇮🇹 ${t.settings.languageItalian}`}
            </button>
          ))}
        </div>

        <div className="section-title">{t.settings.periodTitle}</div>
        <div className="card">
          <button type="button" className={styles.catRow} onClick={() => setPeriodSheetOpen(true)}>
            <div className={styles.catEmoji}>🗓️</div>
            <span className={styles.catName}>{t.settings.periodStartLabel}</span>
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
              {periodStartDay === 1 ? t.settings.periodFirstDay : t.settings.periodDayN(periodStartDay)}
            </span>
            <IconChevronRight width={16} height={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        </div>

        <div className="section-title">{t.settings.expenseCategories}</div>
        <div className="card">
          {expenseCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.catRow}
              onClick={() => setCategorySheet({ item: c, kind: 'expense' })}
            >
              <div className={styles.catEmoji} style={{ ['--cat-color' as string]: c.color }}>
                {c.emoji}
              </div>
              <span className={styles.catName}>{c.name}</span>
              {c.archived && <span className={styles.archivedTag}>{t.settings.archivedTag}</span>}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-ghost btn-block ${styles.addCatBtn}`}
            onClick={() => setCategorySheet({ item: null, kind: 'expense' })}
          >
            {t.settings.newExpenseCategory}
          </button>
        </div>

        <div className="section-title">{t.settings.incomeCategories}</div>
        <div className="card">
          {incomeCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.catRow}
              onClick={() => setCategorySheet({ item: c, kind: 'income' })}
            >
              <div className={styles.catEmoji} style={{ ['--cat-color' as string]: c.color }}>
                {c.emoji}
              </div>
              <span className={styles.catName}>{c.name}</span>
              {c.archived && <span className={styles.archivedTag}>{t.settings.archivedTag}</span>}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-ghost btn-block ${styles.addCatBtn}`}
            onClick={() => setCategorySheet({ item: null, kind: 'income' })}
          >
            {t.settings.newIncomeCategory}
          </button>
        </div>

        <div className="section-title">{t.settings.dataSection}</div>
        <div className="card stack">
          <button type="button" className="btn btn-block" onClick={() => exportJSON()} disabled={busy}>
            <IconDownload width={16} height={16} /> {t.settings.exportBackupJson}
          </button>
          <button type="button" className="btn btn-block" onClick={() => exportCSV()} disabled={busy}>
            <IconDownload width={16} height={16} /> {t.settings.exportTransactionsCsv}
          </button>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <IconUpload width={16} height={16} /> {t.settings.importBackupJson}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className={styles.hiddenFileInput}
            onChange={handleImportFile}
          />
        </div>

        <div className="section-title">{t.settings.dangerZone}</div>
        <div className="card">
          <button type="button" className="btn btn-danger btn-block" onClick={handleDeleteAll} disabled={busy}>
            {t.settings.deleteAllData}
          </button>
        </div>

        <div className="section-title">{t.settings.diagnostics}</div>
        <div className={styles.diagBlock}>
          <div>
            {t.settings.diagVersion}: {__APP_VERSION__}
          </div>
          <div>
            {t.settings.diagStandalone}: {String(diagnostics?.standalone ?? '…')}
          </div>
          <div>
            {t.settings.diagDisplayMode}: {diagnostics?.displayMode ?? '…'}
          </div>
          <div>
            {t.settings.diagViewportSize}: {diagnostics?.innerWidth ?? '…'} × {diagnostics?.innerHeight ?? '…'}
          </div>
          <div>
            {t.settings.diagScreenSize}: {diagnostics?.screenWidth ?? '…'} × {diagnostics?.screenHeight ?? '…'}
          </div>
          <div>
            {t.settings.diagVisualViewportHeight}: {diagnostics?.visualViewportHeight ?? '…'}
          </div>
          <div>
            {t.settings.diagSafeAreaTop}: {diagnostics?.insets.top ?? '…'}
          </div>
          <div>
            {t.settings.diagSafeAreaRight}: {diagnostics?.insets.right ?? '…'}
          </div>
          <div>
            {t.settings.diagSafeAreaBottom}: {diagnostics?.insets.bottom ?? '…'}
          </div>
          <div>
            {t.settings.diagSafeAreaLeft}: {diagnostics?.insets.left ?? '…'}
          </div>
        </div>
      </div>

      {categorySheet && (
        <CategoryFormSheet
          editing={categorySheet.item}
          defaultKind={categorySheet.kind}
          onClose={() => setCategorySheet(null)}
        />
      )}
      {periodSheetOpen && <PeriodStartSheet onClose={() => setPeriodSheetOpen(false)} />}
    </Sheet>
  )
}
