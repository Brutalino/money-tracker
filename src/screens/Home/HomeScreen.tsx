import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Ring } from '../../components/ui/Ring'
import { EmptyState } from '../../components/ui/EmptyState'
import { TransactionRow } from '../../components/TransactionRow'
import { QuickEntrySheet } from '../../components/QuickEntry/QuickEntrySheet'
import styles from './HomeScreen.module.css'
import { db } from '../../db/db'
import {
  getMonthTransactions,
  getBudgetsForMonth,
  sumBudgetEuros,
  sumCents,
  budgetStatus,
  goalSavedCents,
  getPeriodContributions,
  sumContributionCents,
  balanceUpToPeriodCents,
} from '../../lib/stats'
import { currentPeriodKey, periodLabel } from '../../lib/period'
import { formatCents } from '../../lib/money'
import { useT } from '../../i18n'
import type { TabKey } from '../../types/nav'
import type { Transaction } from '../../db/types'

interface Props {
  onOpenSettings: () => void
  onNavigate: (tab: TabKey) => void
}

export function HomeScreen({ onOpenSettings, onNavigate }: Props) {
  const t = useT()
  const currentMonth = currentPeriodKey()
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const data = useLiveQuery(async () => {
    const [monthTx, budgets, categories, goalsAll, recentTx, periodContributions, balanceCents] = await Promise.all([
      getMonthTransactions(currentMonth),
      getBudgetsForMonth(currentMonth),
      db.categories.toArray(),
      db.goals.toArray(),
      db.transactions.orderBy('date').reverse().limit(3).toArray(),
      getPeriodContributions(currentMonth),
      balanceUpToPeriodCents(currentMonth),
    ])
    // The legacy `archived` flag is deliberately ignored — see RisparmiScreen.
    const topGoal = [...goalsAll].sort((a, b) => a.sortOrder - b.sortOrder)[0]
    const topGoalSaved = topGoal ? await goalSavedCents(topGoal.id) : 0
    return { monthTx, budgets, categories, topGoal, topGoalSaved, recentTx, periodContributions, balanceCents }
  }, [currentMonth])

  if (!data) return null

  const categoryById = new Map(data.categories.map((c) => [c.id, c]))
  const totalBudgetEuros = sumBudgetEuros(data.budgets)
  const hasBudget = data.budgets.length > 0
  const variableSpentCents = sumCents(data.monthTx.variableExpenses)
  const setAsideCents = sumContributionCents(data.periodContributions)
  const totalBudgetCents = totalBudgetEuros * 100
  const remainingCents = totalBudgetCents - variableSpentCents - setAsideCents
  const usedFraction = totalBudgetCents > 0 ? (variableSpentCents + setAsideCents) / totalBudgetCents : 0
  const status = budgetStatus(usedFraction)
  const incomeCents = sumCents(data.monthTx.incomes)
  const spentCents = sumCents(data.monthTx.expenses)
  const { balanceCents } = data

  return (
    <div className="screen-root">
      <Header title={periodLabel(currentMonth)} onOpenSettings={onOpenSettings} />
      <div className={`screen-pad ${styles.wrap}`}>
        <div className={`card ${styles.mainCard}`}>
          <div className={styles.mainLabel}>{t.home.balance}</div>
          <div
            className={styles.mainAmount}
            style={{ color: balanceCents < 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
          >
            {formatCents(balanceCents)}
          </div>
          <div className={styles.heroBreakdown}>
            {t.home.heroBreakdown(formatCents(incomeCents), formatCents(spentCents))}
            {setAsideCents > 0 && ` · ${t.home.heroSetAside(formatCents(setAsideCents))}`}
          </div>
          {hasBudget && (
            <div className={styles.budgetRow}>
              <div style={{ flex: 1 }}>
                <ProgressBar fraction={usedFraction} status={status} />
              </div>
              <span className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                {t.home.budgetRemainingShort(formatCents(remainingCents))}
              </span>
            </div>
          )}
        </div>

        <div>
          <div className={styles.sectionHeaderRow}>
            <span className="section-title" style={{ margin: 0 }}>
              {t.nav.savings}
            </span>
            <button type="button" className={styles.link} onClick={() => onNavigate('risparmi')}>
              {t.common.seeAll}
            </button>
          </div>
          {data.topGoal ? (
            <div className={`card ${styles.savingsCard}`} style={{ marginTop: 10 }}>
              <Ring
                fraction={data.topGoalSaved / data.topGoal.targetCents}
                size={44}
                stroke={5}
                color="var(--series-5)"
              >
                <span style={{ fontSize: 16 }}>{data.topGoal.emoji}</span>
              </Ring>
              <div className={styles.savingsInfo}>
                <div className={styles.savingsName}>{data.topGoal.name}</div>
                <div className={styles.savingsAmounts}>
                  {t.common.amountOfTarget(formatCents(data.topGoalSaved), formatCents(data.topGoal.targetCents))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginTop: 10 }}>
              <EmptyState
                emoji="🐷"
                title={t.goals.noGoalsTitle}
                subtitle={t.home.noGoalsSubtitle}
              />
            </div>
          )}
        </div>

        <div>
          <div className={styles.sectionHeaderRow}>
            <span className="section-title" style={{ margin: 0 }}>
              {t.home.recentTransactions}
            </span>
            <button type="button" className={styles.link} onClick={() => onNavigate('spese')}>
              {t.common.seeAll}
            </button>
          </div>
          {data.recentTx.length === 0 ? (
            <div className="card" style={{ marginTop: 10 }}>
              <EmptyState
                emoji="🧾"
                title={t.transactions.noneTitle}
                subtitle={t.home.noTransactionsSubtitle}
              />
            </div>
          ) : (
            <div className="card" style={{ marginTop: 10 }}>
              {data.recentTx.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  category={categoryById.get(t.categoryId)}
                  onClick={() => setEditingTx(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingTx && <QuickEntrySheet editingTransaction={editingTx} onClose={() => setEditingTx(null)} />}
    </div>
  )
}
