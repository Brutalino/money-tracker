import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { MonthSelector } from '../../components/MonthSelector'
import { EmptyState } from '../../components/ui/EmptyState'
import { BudgetCategoryRow } from './BudgetCategoryRow'
import { SuggestBudgetSheet } from './SuggestBudgetSheet'
import { SmartBudgetSheet } from './SmartBudgetSheet'
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
import { useT } from '../../i18n'

interface Props {
  onOpenSettings: () => void
}

export function BudgetScreen({ onOpenSettings }: Props) {
  const t = useT()
  const [month, setMonth] = useState(currentMonthKey())
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [smartBudgetOpen, setSmartBudgetOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  useEffect(() => {
    setCopyMessage(null)
  }, [month])

  const data = useLiveQuery(async () => {
    const categories = (await db.categories.toArray())
      .filter((c) => c.kind === 'expense' && !c.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const [budgets, monthTx, prevMonthTx, prevMonthBudgets] = await Promise.all([
      getBudgetsForMonth(month),
      getMonthTransactions(month),
      getMonthTransactions(addMonths(month, -1)),
      getBudgetsForMonth(addMonths(month, -1)),
    ])
    const spentByCat = groupByCategory(monthTx.variableExpenses)
    const prevSpentByCat = groupByCategory(prevMonthTx.variableExpenses)
    return { categories, budgets, spentByCat, prevSpentByCat, prevMonthBudgets }
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
  const prevMonthHasBudgets = data.prevMonthBudgets.length > 0

  async function handleCopyPrev() {
    if (!prevMonthHasBudgets) {
      setCopyMessage(t.budget.noBudgetToCopy(prevMonthLbl))
      return
    }
    if (!confirm(t.budget.confirmCopy(prevMonthLbl, monthLabel(month)))) return
    setCopyMessage(null)
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
      <Header title={t.nav.budget} onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <MonthSelector month={month} onChange={setMonth} disableFuture={false} />

        <div className={`card ${styles.totalCard}`}>
          <span className={styles.totalLabel}>{t.budget.totalBudget}</span>
          <span className={styles.totalValue}>{formatEuros(totalBudgeted)}</span>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`btn ${styles.actionBtn}`}
            onClick={() => setSuggestOpen(true)}
          >
            {t.budget.suggestFromHabits}
          </button>
          <button
            type="button"
            className={`btn ${styles.actionBtn}`}
            onClick={() => setSmartBudgetOpen(true)}
          >
            {t.budget.suggestWithTarget}
          </button>
        </div>
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`btn ${styles.actionBtn}`}
            onClick={handleCopyPrev}
            aria-disabled={!prevMonthHasBudgets}
          >
            {t.budget.copyFrom(prevMonthLbl.split(' ')[0])}
          </button>
        </div>
        {copyMessage && (
          <p className="muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>
            {copyMessage}
          </p>
        )}

        {data.categories.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title={t.budget.noCategoriesTitle}
            subtitle={t.budget.noCategoriesSubtitle}
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

      {smartBudgetOpen && (
        <SmartBudgetSheet
          month={month}
          categories={data.categories}
          onClose={() => setSmartBudgetOpen(false)}
          onApplied={() => {
            setSmartBudgetOpen(false)
            setResetKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
