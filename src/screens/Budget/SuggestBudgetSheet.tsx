import { Sheet } from '../../components/ui/Sheet'
import { formatEuros } from '../../lib/money'
import type { Category } from '../../db/types'

interface Props {
  onClose: () => void
  onConfirm: () => void
  suggestions: Map<string, number>
  categories: Category[]
}

export function SuggestBudgetSheet({ onClose, onConfirm, suggestions, categories }: Props) {
  const total = Array.from(suggestions.values()).reduce((a, b) => a + b, 0)
  return (
    <Sheet title="Budget suggerito" onClose={onClose}>
      <p className="secondary-text" style={{ fontSize: 13, marginBottom: 14 }}>
        Calcolato sulla media delle spese degli ultimi mesi, arrotondato ai 5€ più vicini.
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
          <span style={{ fontWeight: 700 }}>Totale</span>
          <strong>{formatEuros(total)}</strong>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: 18 }}
        onClick={onConfirm}
      >
        Applica al mese
      </button>
    </Sheet>
  )
}
