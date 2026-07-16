import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { MonthSelector } from '../../components/MonthSelector'
import { EmptyState } from '../../components/ui/EmptyState'
import { BudgetCategoryRow } from './BudgetCategoryRow'
import { SuggestBudgetSheet } from './SuggestBudgetSheet'
import styles from './BudgetScreen.module.css'
import { db } from '../../db/db'
import {
  getMonthTransactions,
  getBudgetsForMonth,
  groupByCategory,
  sumBudgetEuros,
  suggestBudgets,
} from '../../lib/stats'
import { copyBudgetsFromMonth, upsertBudget } from '../../lib/budgets'
import { currentMonthKey, addMonths, monthLabel } from '../../lib/dates'
import { formatEuros } from '../../lib/money'

interface Props {
  onOpenSettings: () => void
}

export function BudgetScreen({ onOpenSettings }: Props) {
  const [month, setMonth] = useState(currentMonthKey())
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const data = useLiveQuery(async () => {
    const categories = (await db.categories.toArray())
      .filter((c) => c.kind === 'expense' && !c.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const [budgets, monthTx, prevMonthTx] = await Promise.all([
      getBudgetsForMonth(month),
      getMonthTransactions(month),
      getMonthTransactions(addMonths(month, -1)),
    ])
    const spentByCat = groupByCategory(monthTx.variableExpenses)
    const prevSpentByCat = groupByCategory(prevMonthTx.variableExpenses)
    return { categories, budgets, spentByCat, prevSpentByCat }
  }, [month, resetKey])

  const suggestions = useLiveQuery(async () => {
    if (!suggestOpen || !data) return null
    return suggestBudgets(
      month,
      data.categories.map((c) => c.id)
    )
  }, [suggestOpen, month, data?.categories])

  if (!data) return null

  const totalBudgeted = sumBudgetEuros(data.budgets)
  const prevMonthLbl = monthLabel(addMonths(month, -1))

  async function handleCopyPrev() {
    if (!confirm(`Copiare i budget di ${prevMonthLbl} su ${monthLabel(month)}?`)) return
    await copyBudgetsFromMonth(addMonths(month, -1), month)
    setResetKey((k) => k + 1)
  }

  async function handleConfirmSuggestions() {
    if (!suggestions) return
    for (const [catId, euros] of suggestions.entries()) {
      await upsertBudget(month, catId, euros)
    }
    setSuggestOpen(false)
    setResetKey((k) => k + 1)
  }

  return (
    <div className="screen-root">
      <Header title="Budget" onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <MonthSelector month={month} onChange={setMonth} disableFuture={false} />

        <div className={`card ${styles.totalCard}`}>
          <span className={styles.totalLabel}>Budget totale</span>
          <span className={styles.totalValue}>{formatEuros(totalBudgeted)}</span>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`btn ${styles.actionBtn}`}
            onClick={() => setSuggestOpen(true)}
          >
            ✨ Suggerisci budget
          </button>
          <button type="button" className={`btn ${styles.actionBtn}`} onClick={handleCopyPrev}>
            📋 Copia da {prevMonthLbl.split(' ')[0]}
          </button>
        </div>

        {data.categories.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Nessuna categoria di spesa"
            subtitle="Aggiungi categorie dalle impostazioni per iniziare a definire un budget."
          />
        ) : (
          data.categories.map((c) => {
            const spentCents = data.spentByCat.get(c.id) ?? 0
            const prevSpentCents = data.prevSpentByCat.get(c.id) ?? 0
            const budget = data.budgets.find((b) => b.categoryId === c.id)
            return (
              <BudgetCategoryRow
                key={`${c.id}:${month}:${resetKey}`}
                month={month}
                category={c}
                initialBudgetEuros={budget?.amountEuros ?? 0}
                spentCents={spentCents}
                deltaCents={spentCents - prevSpentCents}
              />
            )
          })
        )}
      </div>

      {suggestOpen && suggestions && (
        <SuggestBudgetSheet
          onClose={() => setSuggestOpen(false)}
          onConfirm={handleConfirmSuggestions}
          suggestions={suggestions}
          categories={data.categories}
        />
      )}
    </div>
  )
}
