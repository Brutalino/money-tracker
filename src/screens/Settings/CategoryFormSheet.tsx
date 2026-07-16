import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { useT } from '../../i18n'
import type { Category, TransactionType } from '../../db/types'

interface Props {
  onClose: () => void
  editing?: Category | null
  defaultKind?: TransactionType
}

const COLOR_OPTIONS = [
  '#2a78d6',
  '#008300',
  '#e87ba4',
  '#eda100',
  '#1baf7a',
  '#eb6834',
  '#4a3aa7',
  '#e34948',
]

export function CategoryFormSheet({ onClose, editing, defaultKind = 'expense' }: Props) {
  const t = useT()
  const [kind, setKind] = useState<TransactionType>(editing?.kind ?? defaultKind)
  const [name, setName] = useState(editing?.name ?? '')
  const [emoji, setEmoji] = useState(editing?.emoji ?? '🏷️')
  const [color, setColor] = useState(editing?.color ?? COLOR_OPTIONS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = name.trim().length > 0 && emoji.trim().length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await db.categories.update(editing.id, { name: name.trim(), emoji: emoji.trim(), color, kind })
      } else {
        const existing = await db.categories.toArray()
        const nextSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1
        await db.categories.add({
          id: makeId(),
          name: name.trim(),
          emoji: emoji.trim(),
          color,
          kind,
          sortOrder: nextSortOrder,
          archived: false,
        })
      }
      onClose()
    } catch {
      setError(t.common.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleArchive() {
    if (!editing) return
    await db.categories.update(editing.id, { archived: !editing.archived })
    onClose()
  }

  return (
    <Sheet title={editing ? t.categoryForm.editTitle : t.categoryForm.newTitle} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn ${kind === 'expense' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setKind('expense')}
            disabled={!!editing}
          >
            {t.finance.expense}
          </button>
          <button
            type="button"
            className={`btn ${kind === 'income' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setKind('income')}
            disabled={!!editing}
          >
            {t.finance.income}
          </button>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ width: 70 }}>
            <label htmlFor="cf-emoji">{t.common.emoji}</label>
            <input
              id="cf-emoji"
              className="input"
              style={{ textAlign: 'center', fontSize: 20 }}
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              maxLength={4}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="cf-name">{t.common.name}</label>
            <input
              id="cf-name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
        </div>

        <div className="field">
          <label>{t.categoryForm.colorLabel}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--text-primary)' : '1px solid var(--border)',
                }}
              />
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={!canSave} onClick={handleSave}>
          {t.common.save}
        </button>
        {error && (
          <div style={{ color: 'var(--status-critical)', fontSize: 12, textAlign: 'center' }}>{error}</div>
        )}

        {editing && (
          <button type="button" className="btn btn-block" onClick={handleToggleArchive}>
            {editing.archived ? t.categoryForm.reactivateCategory : t.categoryForm.archiveCategory}
          </button>
        )}
      </div>
    </Sheet>
  )
}
