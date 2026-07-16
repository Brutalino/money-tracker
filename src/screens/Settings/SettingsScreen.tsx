import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { IconBack, IconDownload, IconUpload } from '../../components/Icons'
import { CategoryFormSheet } from './CategoryFormSheet'
import styles from './SettingsScreen.module.css'
import { db } from '../../db/db'
import { getStoredTheme, setStoredTheme, applyThemeToDocument } from '../../lib/theme'
import { exportJSON, exportCSV, importBackup, isValidBackup, deleteAllData } from '../../lib/backup'
import { ensureSeeded } from '../../lib/seed'
import type { Category, ThemeMode } from '../../db/types'

interface Props {
  onClose: () => void
}

export function SettingsScreen({ onClose }: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null)
  const [categorySheet, setCategorySheet] = useState<{ item: Category | null; kind: 'expense' | 'income' } | null>(
    null
  )
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStoredTheme().then(setThemeMode)
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

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!isValidBackup(parsed)) {
        alert('File non valido: non sembra un backup di Money Tracker.')
        return
      }
      if (
        !confirm(
          'Importare questo backup sostituirà TUTTI i dati attuali. Questa azione non può essere annullata. Continuare?'
        )
      )
        return
      setBusy(true)
      await importBackup(parsed)
      alert('Backup importato con successo.')
    } catch {
      alert('Impossibile leggere il file selezionato.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteAll() {
    if (!confirm('Eliminare TUTTI i dati (transazioni, budget, obiettivi, categorie)? Non è reversibile.'))
      return
    if (!confirm('Sei sicuro/a? Questa è la conferma finale: tutti i dati verranno cancellati per sempre.'))
      return
    setBusy(true)
    try {
      await deleteAllData()
      await ensureSeeded()
      alert('Tutti i dati sono stati eliminati.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet variant="full" hideHeader onClose={onClose}>
      <div className={styles.top}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="Indietro">
          <IconBack width={18} height={18} />
        </button>
        <span className={styles.title}>Impostazioni</span>
      </div>

      <div className={styles.body}>
        <div className="section-title">Aspetto</div>
        <div className={styles.segmented}>
          {(['auto', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.segBtn} ${themeMode === mode ? styles.segBtnActive : ''}`}
              onClick={() => handleThemeChange(mode)}
            >
              {mode === 'auto' ? 'Auto' : mode === 'light' ? 'Chiaro' : 'Scuro'}
            </button>
          ))}
        </div>

        <div className="section-title">Categorie di spesa</div>
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
              {c.archived && <span className={styles.archivedTag}>Archiviata</span>}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-ghost btn-block ${styles.addCatBtn}`}
            onClick={() => setCategorySheet({ item: null, kind: 'expense' })}
          >
            + Nuova categoria di spesa
          </button>
        </div>

        <div className="section-title">Categorie di entrata</div>
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
              {c.archived && <span className={styles.archivedTag}>Archiviata</span>}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-ghost btn-block ${styles.addCatBtn}`}
            onClick={() => setCategorySheet({ item: null, kind: 'income' })}
          >
            + Nuova categoria di entrata
          </button>
        </div>

        <div className="section-title">Dati</div>
        <div className="card stack">
          <button type="button" className="btn btn-block" onClick={() => exportJSON()} disabled={busy}>
            <IconDownload width={16} height={16} /> Esporta backup (JSON)
          </button>
          <button type="button" className="btn btn-block" onClick={() => exportCSV()} disabled={busy}>
            <IconDownload width={16} height={16} /> Esporta transazioni (CSV)
          </button>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <IconUpload width={16} height={16} /> Importa backup (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className={styles.hiddenFileInput}
            onChange={handleImportFile}
          />
        </div>

        <div className="section-title">Zona pericolosa</div>
        <div className="card">
          <button type="button" className="btn btn-danger btn-block" onClick={handleDeleteAll} disabled={busy}>
            Elimina tutti i dati
          </button>
        </div>

        <div className={styles.version}>Money Tracker v{__APP_VERSION__}</div>
      </div>

      {categorySheet && (
        <CategoryFormSheet
          editing={categorySheet.item}
          defaultKind={categorySheet.kind}
          onClose={() => setCategorySheet(null)}
        />
      )}
    </Sheet>
  )
}
