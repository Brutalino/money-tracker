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
import { useT } from '../../i18n'
import { decimalSeparator } from '../../lib/locale'
import type { Transaction, TransactionType } from '../../db/types'

interface Prefill {
  type: TransactionType
  amountCents: number
  date: string
  note?: string
}

interface Props {
  onClose: () => void
  editingTransaction?: Transaction | null
  defaultType?: TransactionType
  /** Prefills a new transaction (e.g. from the Fineco bank check) without
   * entering edit mode: saving always creates a new transaction, and the
   * category is still left for the user to pick. Ignored if editingTransaction is set. */
  prefill?: Prefill
  /** Small accent-tinted banner shown at the top of the sheet content, e.g. to
   * explain where a prefilled amount came from. */
  sourceBanner?: string
}

export function QuickEntrySheet({ onClose, editingTransaction, defaultType = 'expense', prefill, sourceBanner }: Props) {
  const t = useT()
  const isEditing = !!editingTransaction
  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? prefill?.type ?? defaultType)
  const categories = useCategories(type)
  const [categoryId, setCategoryId] = useState<string | null>(editingTransaction?.categoryId ?? null)
  const [buffer, setBuffer] = useState<string>(() => {
    const source = editingTransaction ?? prefill
    if (!source) return ''
    const euros = source.amountCents / 100
    return euros.toString().replace('.', decimalSeparator())
  })
  const [date, setDate] = useState(editingTransaction?.date ?? prefill?.date ?? todayISO())
  const [note, setNote] = useState(editingTransaction?.note ?? prefill?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  // When switching type (and not editing), reset category selection so it matches the new kind.
  useEffect(() => {
    if (!categories) return
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(null)
    }
  }, [categories, categoryId])

  const amountCents = parseAmountToCents(buffer)
  const canSave = amountCents > 0 && !!categoryId && !saving
  const hint =
    amountCents > 0 && !categoryId
      ? t.quickEntry.chooseCategory
      : amountCents === 0 && !!categoryId
        ? t.quickEntry.enterAmount
        : null

  async function handleSave() {
    if (!canSave || !categoryId) return
    setSaving(true)
    setError(null)
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
      setClosing(true)
    } catch {
      setError(t.common.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingTransaction) return
    if (!confirm(t.quickEntry.confirmDelete)) return
    await db.transactions.delete(editingTransaction.id)
    setClosing(true)
  }

  return (
    <Sheet variant="full" hideHeader closing={closing} onClose={onClose}>
      {sourceBanner && (
        <div className={styles.sourceBanner}>
          <span>🏦</span>
          <span>{sourceBanner}</span>
        </div>
      )}
      <div className={styles.top}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setClosing(true)}
          aria-label={t.quickEntry.closeAriaLabel}
        >
          <IconClose width={18} height={18} />
        </button>
        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segBtn} ${type === 'expense' ? styles.segBtnActiveExpense : ''}`}
            onClick={() => setType('expense')}
          >
            {t.finance.expense}
          </button>
          <button
            type="button"
            className={`${styles.segBtn} ${type === 'income' ? styles.segBtnActiveIncome : ''}`}
            onClick={() => setType('income')}
          >
            {t.finance.income}
          </button>
        </div>
        {isEditing ? (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            aria-label={t.quickEntry.deleteAriaLabel}
          >
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
          layout="scroll2"
        />

        <div className={styles.metaRow}>
          <div className={styles.metaField}>
            <label className={styles.metaLabel} htmlFor="qe-date">
              {t.common.date}
            </label>
            <input
              id="qe-date"
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.metaField}>
          <label className={styles.metaLabel} htmlFor="qe-note">
            {t.common.noteOptional}
          </label>
          <input
            id="qe-note"
            type="text"
            className={styles.noteInput}
            value={note}
            placeholder={t.quickEntry.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
          />
        </div>
      </div>

      <div className={styles.keypadWrap}>
        <Keypad onKey={(k) => setBuffer((b) => applyKeypadKey(b, k))} />
        <button type="button" className={styles.saveBtn} disabled={!canSave} onClick={handleSave}>
          {isEditing ? t.common.saveChanges : t.common.save}
        </button>
        {error ? (
          <div className={styles.errorText}>{error}</div>
        ) : hint ? (
          <div className={styles.hintText}>{hint}</div>
        ) : null}
      </div>
    </Sheet>
  )
}
