import { useEffect, useState } from 'react'
import styles from './QuickEntrySheet.module.css'
import { Sheet } from '../ui/Sheet'
import { Keypad } from './Keypad'
import { CategoryChips } from '../CategoryChips'
import { IconClose, IconTrash } from '../Icons'
import { useCategories } from '../../hooks/useDb'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { applyKeypadKey, formatBufferDisplay } from '../../lib/keypadBuffer'
import { parseAmountToCents } from '../../lib/money'
import { todayISO } from '../../lib/dates'
import type { Transaction, TransactionType } from '../../db/types'

interface Props {
  onClose: () => void
  editingTransaction?: Transaction | null
  defaultType?: TransactionType
}

export function QuickEntrySheet({ onClose, editingTransaction, defaultType = 'expense' }: Props) {
  const isEditing = !!editingTransaction
  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? defaultType)
  const categories = useCategories(type)
  const [categoryId, setCategoryId] = useState<string | null>(editingTransaction?.categoryId ?? null)
  const [buffer, setBuffer] = useState<string>(() => {
    if (!editingTransaction) return ''
    const euros = editingTransaction.amountCents / 100
    return euros.toString().replace('.', ',')
  })
  const [date, setDate] = useState(editingTransaction?.date ?? todayISO())
  const [note, setNote] = useState(editingTransaction?.note ?? '')
  const [saving, setSaving] = useState(false)

  // When switching type (and not editing), reset category selection so it matches the new kind.
  useEffect(() => {
    if (!categories) return
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(null)
    }
  }, [categories, categoryId])

  const amountCents = parseAmountToCents(buffer)
  const canSave = amountCents > 0 && !!categoryId && !saving

  async function handleSave() {
    if (!canSave || !categoryId) return
    setSaving(true)
    try {
      if (isEditing && editingTransaction) {
        await db.transactions.update(editingTransaction.id, {
          amountCents,
          type,
          categoryId,
          date,
          note: note.trim() || undefined,
        })
      } else {
        await db.transactions.add({
          id: makeId(),
          amountCents,
          type,
          categoryId,
          date,
          note: note.trim() || undefined,
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingTransaction) return
    if (!confirm('Eliminare questa transazione?')) return
    await db.transactions.delete(editingTransaction.id)
    onClose()
  }

  return (
    <Sheet variant="full" hideHeader onClose={onClose}>
      <div className={styles.top}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Chiudi">
          <IconClose width={18} height={18} />
        </button>
        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segBtn} ${type === 'expense' ? styles.segBtnActiveExpense : ''}`}
            onClick={() => setType('expense')}
          >
            Spesa
          </button>
          <button
            type="button"
            className={`${styles.segBtn} ${type === 'income' ? styles.segBtnActiveIncome : ''}`}
            onClick={() => setType('income')}
          >
            Entrata
          </button>
        </div>
        {isEditing ? (
          <button type="button" className={styles.deleteBtn} onClick={handleDelete} aria-label="Elimina">
            <IconTrash width={18} height={18} />
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
      </div>

      <div className={styles.amountWrap}>
        <span className={styles.amount}>{formatBufferDisplay(buffer)}</span>
        <span className={styles.currency}>€</span>
      </div>

      <div className={styles.body}>
        <CategoryChips
          categories={categories ?? []}
          selectedId={categoryId}
          onSelect={setCategoryId}
          layout="grid"
        />

        <div className={styles.metaRow}>
          <div className={styles.metaField}>
            <label className={styles.metaLabel} htmlFor="qe-date">
              Data
            </label>
            <input
              id="qe-date"
              type="date"
              className={styles.dateInput}
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.metaField}>
          <label className={styles.metaLabel} htmlFor="qe-note">
            Nota (opzionale)
          </label>
          <input
            id="qe-note"
            type="text"
            className={styles.noteInput}
            value={note}
            placeholder="Aggiungi una nota..."
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
          />
        </div>
      </div>

      <div className={styles.keypadWrap}>
        <Keypad onKey={(k) => setBuffer((b) => applyKeypadKey(b, k))} />
        <button type="button" className={styles.saveBtn} disabled={!canSave} onClick={handleSave}>
          {isEditing ? 'Salva modifiche' : 'Salva'}
        </button>
      </div>
    </Sheet>
  )
}
