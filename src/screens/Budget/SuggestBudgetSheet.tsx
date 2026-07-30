import { useRef, useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { formatEuros } from '../../lib/money'
import { useT } from '../../i18n'
import type { Category } from '../../db/types'

interface Props {
  onClose: () => void
  onConfirm: () => void
  suggestions: Map<string, number>
  categories: Category[]
}

export function SuggestBudgetSheet({ onClose, onConfirm, suggestions, categories }: Props) {
  const t = useT()
  const total = Array.from(suggestions.values()).reduce((a, b) => a + b, 0)
  const [closing, setClosing] = useState(false)
  // Two distinct actions can dismiss this sheet (plain close vs. confirm);
  // remember which one the user picked so it fires only after the exit
  // animation finishes.
  const pendingActionRef = useRef<() => void>(onClose)

  function handleClose() {
    pendingActionRef.current = onClose
    setClosing(true)
  }

  function handleConfirm() {
    pendingActionRef.current = onConfirm
    setClosing(true)
  }

  if (suggestions.size === 0) {
    return (
      <Sheet title={t.budget.suggestedBudgetTitle} closing={closing} onClose={() => pendingActionRef.current()}>
        <p className="secondary-text" style={{ fontSize: 13 }}>
          {t.budget.notEnoughHistory}
        </p>
        <button type="button" className="btn btn-block" style={{ marginTop: 18 }} onClick={handleClose}>
          {t.common.close}
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet title={t.budget.suggestedBudgetTitle} closing={closing} onClose={() => pendingActionRef.current()}>
      <p className="secondary-text" style={{ fontSize: 13, marginBottom: 14 }}>
        {t.budget.suggestExplanation}
      </p>
      <div className="stack" style={{ gap: 8 }}>
        {categories.map((c) => (
          <div key={c.id} className="row">
            <span style={{ fontSize: 14 }}>
              {c.emoji} {c.name}
            </span>
            <strong>{formatEuros(suggestions.get(c.id) ?? 0)}</strong>
          </div>
        ))}
        <hr className="divider" style={{ margin: '6px 0' }} />
        <div className="row">
          <span style={{ fontWeight: 700 }}>{t.common.total}</span>
          <strong>{formatEuros(total)}</strong>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: 18 }}
        onClick={handleConfirm}
      >
        {t.budget.applyToMonth}
      </button>
    </Sheet>
  )
}
