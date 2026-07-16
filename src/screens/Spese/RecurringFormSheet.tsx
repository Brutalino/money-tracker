import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { CategoryChips } from '../../components/CategoryChips'
import { useCategories } from '../../hooks/useDb'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { eurosToCents, centsToEuros } from '../../lib/money'
import { currentMonthKey } from '../../lib/dates'
import { FREQUENCY_LABELS_IT, materializeRecurring } from '../../lib/recurring'
import type { Recurring, RecurringFrequency, TransactionType } from '../../db/types'

interface Props {
  onClose: () => void
  editing?: Recurring | null
}

const FREQUENCIES: RecurringFrequency[] = ['monthly', 'bimonthly', 'quarterly', 'annual']

export function RecurringFormSheet({ onClose, editing }: Props) {
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense')
  const categories = useCategories(type)
  const [name, setName] = useState(editing?.name ?? '')
  const [amount, setAmount] = useState(
    editing ? centsToEuros(editing.amountCents).toString().replace('.', ',') : ''
  )
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency ?? 'monthly')
  const [saving, setSaving] = useState(false)

  const amountCents = eurosToCents(Number.parseFloat(amount.replace(',', '.')) || 0)
  const canSave = name.trim().length > 0 && amountCents > 0 && !!categoryId && !saving

  async function handleSave() {
    if (!canSave || !categoryId) return
    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!editing) return
    const nowActive = !editing.active
    await db.recurring.update(editing.id, { active: nowActive })
    if (nowActive) await materializeRecurring()
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm('Eliminare questo costo fisso? Le transazioni già generate rimarranno nello storico.'))
      return
    await db.recurring.delete(editing.id)
    onClose()
  }

  return (
    <Sheet title={editing ? 'Modifica costo fisso' : 'Nuovo costo fisso'} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn ${type === 'expense' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setType('expense')}
          >
            Uscita
          </button>
          <button
            type="button"
            className={`btn ${type === 'income' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setType('income')}
          >
            Entrata
          </button>
        </div>

        <div className="field">
          <label htmlFor="rf-name">Nome</label>
          <input
            id="rf-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Affitto, Netflix, Palestra..."
            maxLength={60}
          />
        </div>

        <div className="field">
          <label htmlFor="rf-amount">Importo (per la frequenza scelta)</label>
          <input
            id="rf-amount"
            className="input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder="0,00"
          />
        </div>

        <div className="field">
          <label htmlFor="rf-freq">Frequenza</label>
          <select
            id="rf-freq"
            className="select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS_IT[f]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Categoria</label>
          <CategoryChips
            categories={categories ?? []}
            selectedId={categoryId}
            onSelect={setCategoryId}
            layout="grid"
          />
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={!canSave} onClick={handleSave}>
          Salva
        </button>

        {editing && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={handleToggleActive}>
              {editing.active ? 'Disattiva' : 'Riattiva'}
            </button>
            <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>
              Elimina
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
