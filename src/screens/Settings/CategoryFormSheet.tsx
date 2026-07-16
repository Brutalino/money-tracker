import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { useT } from '../../i18n'
import { categoryFlexibility } from '../../lib/smartBudget'
import type { Category, Flexibility, TransactionType } from '../../db/types'

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
  const [flexibility, setFlexibility] = useState<Flexibility>(categoryFlexibility(editing?.flexibility))
  const [habit, setHabit] = useState(editing?.habit ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = name.trim().length > 0 && emoji.trim().length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const flexFields = kind === 'expense' ? { flexibility, habit } : {}
      if (editing) {
        await db.categories.update(editing.id, {
          name: name.trim(),
          emoji: emoji.trim(),
          color,
          kind,
          ...flexFields,
        })
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
          ...flexFields,
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

        {kind === 'expense' && (
          <>
            <div className="field">
              <label>{t.categoryForm.flexibilityLabel}</label>
              <div className="row" style={{ gap: 6 }}>
                {(['essential', 'flexible', 'veryFlexible'] as Flexibility[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`btn ${flexibility === f ? 'btn-primary' : ''}`}
                    style={{ flex: 1, flexDirection: 'column', gap: 1, padding: '6px 4px', minHeight: 52 }}
                    onClick={() => setFlexibility(f)}
                  >
                    <span style={{ fontSize: 12.5 }}>
                      {f === 'essential'
                        ? t.categoryForm.flexibilityEssential
                        : f === 'flexible'
                          ? t.categoryForm.flexibilityFlexible
                          : t.categoryForm.flexibilityVeryFlexible}
                    </span>
                    {f !== 'flexible' && (
                      <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>
                        {f === 'essential'
                          ? t.categoryForm.flexibilityEssentialHint
                          : t.categoryForm.flexibilityVeryFlexibleHint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <button
                type="button"
                className="row"
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0 }}
                onClick={() => setHabit((h) => !h)}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.categoryForm.habitLabel}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 999,
                    background: habit ? 'var(--accent)' : 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: habit ? 20 : 1,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      transition: 'left 0.15s',
                    }}
                  />
                </span>
              </button>
              <p className="muted" style={{ fontSize: 11.5, margin: '2px 0 0' }}>
                {t.categoryForm.habitHint}
              </p>
            </div>
          </>
        )}

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
