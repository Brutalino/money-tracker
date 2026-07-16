import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { db } from '../../db/db'
import { makeId } from '../../lib/id'
import { eurosToCents, centsToEuros } from '../../lib/money'
import { useT } from '../../i18n'
import type { Goal } from '../../db/types'

interface Props {
  onClose: () => void
  editing?: Goal | null
}

const EMOJI_OPTIONS = ['🏖️', '✈️', '🚗', '🏠', '💍', '🎓', '💻', '🎮', '🩺', '🐷', '🎁', '📱', '🎸', '🚲']

export function GoalFormSheet({ onClose, editing }: Props) {
  const t = useT()
  const [emoji, setEmoji] = useState(editing?.emoji ?? EMOJI_OPTIONS[0])
  const [name, setName] = useState(editing?.name ?? '')
  const [target, setTarget] = useState(editing ? String(centsToEuros(editing.targetCents)) : '')
  const [deadline, setDeadline] = useState(editing?.deadline ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetCents = eurosToCents(Number.parseFloat(target.replace(',', '.')) || 0)
  const canSave = name.trim().length > 0 && targetCents > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await db.goals.update(editing.id, {
          emoji,
          name: name.trim(),
          targetCents,
          deadline: deadline || undefined,
        })
      } else {
        const existing = await db.goals.toArray()
        const nextSortOrder = existing.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1
        await db.goals.add({
          id: makeId(),
          emoji,
          name: name.trim(),
          targetCents,
          deadline: deadline || undefined,
          archived: false,
          sortOrder: nextSortOrder,
        })
      }
      onClose()
    } catch {
      setError(t.common.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!editing) return
    await db.goals.update(editing.id, { archived: !editing.archived })
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(t.goalForm.confirmDelete)) return
    await db.transaction('rw', [db.goals, db.contributions], async () => {
      await db.contributions.where('goalId').equals(editing.id).delete()
      await db.goals.delete(editing.id)
    })
    onClose()
  }

  return (
    <Sheet title={editing ? t.goalForm.editTitle : t.goalForm.newTitle} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label>{t.common.emoji}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className="btn"
                style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  fontSize: 20,
                  borderColor: emoji === e ? 'var(--accent)' : undefined,
                  background: emoji === e ? 'color-mix(in srgb, var(--accent) 16%, var(--surface-2))' : undefined,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="gf-name">{t.goalForm.nameLabel}</label>
          <input
            id="gf-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.goalForm.namePlaceholder}
            maxLength={60}
          />
        </div>

        <div className="field">
          <label htmlFor="gf-target">{t.goalForm.targetLabel}</label>
          <input
            id="gf-target"
            className="input"
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9,.]/g, ''))}
            placeholder="0"
          />
        </div>

        <div className="field">
          <label htmlFor="gf-deadline">{t.goalForm.deadlineLabel}</label>
          <input
            id="gf-deadline"
            className="input"
            type="month"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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
            <button type="button" className="btn" style={{ flex: 1 }} onClick={handleArchive}>
              {editing.archived ? t.common.reactivate : t.goalForm.archive}
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
