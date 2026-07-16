import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { CategoryChips } from '../../components/CategoryChips'
import { useCategories } from '../../hooks/useDb'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { eurosToCents, centsToEuros, formatCents } from '../../lib/money'
import { currentMonthKey, firstOfMonth } from '../../lib/dates'
import { materializeRecurring, monthlyEquivalentCents } from '../../lib/recurring'
import { useT } from '../../i18n'
import { decimalSeparator } from '../../lib/locale'
import type { Recurring, RecurringFrequency, TransactionType } from '../../db/types'

interface Props {
  onClose: () => void
  editing?: Recurring | null
}

const FREQUENCIES: RecurringFrequency[] = ['monthly', 'bimonthly', 'quarterly', 'annual']

export function RecurringFormSheet({ onClose, editing }: Props) {
  const t = useT()
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense')
  const categories = useCategories(type)
  const [name, setName] = useState(editing?.name ?? '')
  const [amount, setAmount] = useState(
    editing ? centsToEuros(editing.amountCents).toString().replace('.', decimalSeparator()) : ''
  )
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency ?? 'monthly')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountCents = eurosToCents(Number.parseFloat(amount.replace(',', '.')) || 0)
  const canSave = name.trim().length > 0 && amountCents > 0 && !!categoryId && !saving

  async function handleSave() {
    if (!canSave || !categoryId) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await db.recurring.update(editing.id, {
          name: name.trim(),
          amountCents,
          categoryId,
          type,
          frequency,
        })
      } else {
        await db.recurring.add({
          id: makeId(),
          name: name.trim(),
          amountCents,
          categoryId,
          type,
          frequency,
          active: true,
          createdMonth: currentMonthKey(),
        })
        // Materialize immediately so the current month's transaction appears
        // without requiring an app reload.
        await materializeRecurring()
      }
      onClose()
    } catch {
      setError(t.common.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!editing) return
    const nowActive = !editing.active
    // Reactivating: reset createdMonth to the current month so the materializer
    // doesn't backfill phantom expenses for the months it was paused.
    const patch = nowActive ? { active: nowActive, createdMonth: currentMonthKey() } : { active: nowActive }
    try {
      await db.recurring.update(editing.id, patch)
      if (nowActive) await materializeRecurring()
      onClose()
    } catch {
      setError(t.common.saveFailed)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(t.recurringForm.confirmDelete)) return
    try {
      // Offer to also clean up this month's already-generated transaction, if any.
      const thisMonthDate = firstOfMonth(currentMonthKey())
      const thisMonthTx = await db.transactions
        .where('[recurringId+date]')
        .equals([editing.id, thisMonthDate])
        .first()

      await db.recurring.delete(editing.id)

      if (thisMonthTx) {
        const amountLabel = formatCents(monthlyEquivalentCents(editing.amountCents, editing.frequency))
        if (confirm(t.recurringForm.confirmDeleteThisMonthTx(amountLabel))) {
          await db.transactions.delete(thisMonthTx.id)
        }
      }
      onClose()
    } catch {
      setError(t.recurringForm.deleteFailedRetry)
    }
  }

  return (
    <Sheet title={editing ? t.recurringForm.editTitle : t.recurringForm.newTitle} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn ${type === 'expense' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setType('expense')}
          >
            {t.recurringForm.expenseOption}
          </button>
          <button
            type="button"
            className={`btn ${type === 'income' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setType('income')}
          >
            {t.recurringForm.incomeOption}
          </button>
        </div>

        <div className="field">
          <label htmlFor="rf-name">{t.common.name}</label>
          <input
            id="rf-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.recurringForm.namePlaceholder}
            maxLength={60}
          />
        </div>

        <div className="field">
          <label htmlFor="rf-amount">{t.recurringForm.amountLabel}</label>
          <input
            id="rf-amount"
            className="input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder={`0${decimalSeparator()}00`}
          />
        </div>

        <div className="field">
          <label htmlFor="rf-freq">{t.recurringForm.frequencyLabel}</label>
          <select
            id="rf-freq"
            className="select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t.frequency[f]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t.common.category}</label>
          <CategoryChips
            categories={categories ?? []}
            selectedId={categoryId}
            onSelect={setCategoryId}
            layout="grid"
          />
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={!canSave} onClick={handleSave}>
          {t.common.save}
        </button>
        {error && (
          <div style={{ color: 'var(--status-critical)', fontSize: 12, textAlign: 'center' }}>{error}</div>
        )}

        {editing && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={handleToggleActive}>
              {editing.active ? t.recurringForm.deactivate : t.common.reactivate}
            </button>
            <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>
              {t.common.delete}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
