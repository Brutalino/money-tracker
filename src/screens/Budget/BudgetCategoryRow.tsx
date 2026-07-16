import { useState } from 'react'
import styles from './BudgetScreen.module.css'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { budgetStatus } from '../../lib/stats'
import { formatCents } from '../../lib/money'
import { upsertBudget } from '../../lib/budgets'
import type { Category } from '../../db/types'

interface Props {
  month: string
  category: Category
  initialBudgetEuros: number
  spentCents: number
  deltaCents: number | null
}

export function BudgetCategoryRow({
  month,
  category,
  initialBudgetEuros,
  spentCents,
  deltaCents,
}: Props) {
  const [value, setValue] = useState(initialBudgetEuros > 0 ? String(initialBudgetEuros) : '')

  const budgetEuros = Number.parseInt(value, 10) || 0
  const budgetCents = budgetEuros * 100
  const fraction = budgetCents > 0 ? spentCents / budgetCents : 0
  const status = budgetStatus(fraction)
  const remainingCents = budgetCents - spentCents

  async function commit() {
    const parsed = Math.max(0, Math.round(Number.parseInt(value, 10) || 0))
    setValue(parsed > 0 ? String(parsed) : '')
    await upsertBudget(month, category.id, parsed)
  }

  return (
    <div className={`card ${styles.catCard}`}>
      <div className={styles.catHeaderRow}>
        <div className={styles.catEmoji} style={{ ['--cat-color' as string]: category.color }}>
          {category.emoji}
        </div>
        <div className={styles.catName}>{category.name}</div>
        <div className={styles.budgetInputWrap}>
          <input
            type="number"
            inputMode="numeric"
            className={styles.budgetInput}
            value={value}
            placeholder="0"
            min={0}
            step={1}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            aria-label={`Budget per ${category.name}`}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            €
          </span>
        </div>
      </div>

      {budgetCents > 0 ? (
        <>
          <ProgressBar fraction={fraction} status={status} height={4} />
          <div className={styles.catStatsRow}>
            <span>Speso {formatCents(spentCents)}</span>
            <span style={{ color: remainingCents < 0 ? 'var(--status-critical)' : undefined }}>
              {remainingCents >= 0 ? 'Rimane' : 'Superato di'} {formatCents(Math.abs(remainingCents))}
              {deltaCents !== null && deltaCents !== 0 ? (deltaCents > 0 ? ' 📈' : ' 📉') : ''}
            </span>
          </div>
        </>
      ) : (
        spentCents > 0 && (
          <div className={styles.catStatsRow}>
            <span>Speso {formatCents(spentCents)}</span>
            <span className="muted">Nessun budget</span>
          </div>
        )
      )}
    </div>
  )
}
