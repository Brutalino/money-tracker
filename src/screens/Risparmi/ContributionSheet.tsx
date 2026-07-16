import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { eurosToCents } from '../../lib/money'
import { todayISO } from '../../lib/dates'
import type { Goal } from '../../db/types'

interface Props {
  goal: Goal
  onClose: () => void
  initialAmountCents?: number
}

export function ContributionSheet({ goal, onClose, initialAmountCents }: Props) {
  const [amount, setAmount] = useState(
    initialAmountCents ? (initialAmountCents / 100).toString().replace('.', ',') : ''
  )
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const amountCents = eurosToCents(Number.parseFloat(amount.replace(',', '.')) || 0)
  const canSave = amountCents > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await db.contributions.add({
        id: makeId(),
        goalId: goal.id,
        amountCents,
        date,
        note: note.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title={`Aggiungi a "${goal.name}"`} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label htmlFor="cs-amount">Importo (€)</label>
          <input
            id="cs-amount"
            className="input"
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder="0,00"
          />
        </div>
        <div className="field">
          <label htmlFor="cs-date">Data</label>
          <input
            id="cs-date"
            className="input"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="cs-note">Nota (opzionale)</label>
          <input
            id="cs-note"
            className="input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
          />
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={!canSave} onClick={handleSave}>
          Aggiungi
        </button>
      </div>
    </Sheet>
  )
}
