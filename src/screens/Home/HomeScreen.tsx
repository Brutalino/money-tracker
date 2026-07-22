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
  computePace,
  goalSavedCents,
} from '../../lib/stats'
import { currentPeriodKey, periodLabel, periodElapsedFraction } from '../../lib/period'
import { formatCents, formatEuros } from '../../lib/money'
import { getSavingsPlan } from '../../lib/savingsPlan'
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
    const [monthTx, budgets, categories, goalsAll, recentTx] = await Promise.all([
      getMonthTransactions(currentMonth),
      getBudgetsForMonth(currentMonth),
      db.categories.toArray(),
      db.goals.toArray(),
      db.transactions.orderBy('date').reverse().limit(3).toArray(),
    ])
    const activeGoals = goalsAll.filter((g) => !g.archived).sort((a, b) => a.sortOrder - b.sortOrder)
    const topGoal = activeGoals[0]
    const topGoalSaved = topGoal ? await goalSavedCents(topGoal.id) : 0
    const savingsPlan = await getSavingsPlan()
    const savingsPlanGoal = savingsPlan?.goalId ? goalsAll.find((g) => g.id === savingsPlan.goalId) : null
    return { monthTx, budgets, categories, topGoal, topGoalSaved, recentTx, savingsPlan, savingsPlanGoal }
  }, [currentMonth])

  if (!data) return null

  const categoryById = new Map(data.categories.map((c) => [c.id, c]))
  const totalBudgetEuros = sumBudgetEuros(data.budgets)
  const hasBudget = data.budgets.length > 0
  const variableSpentCents = sumCents(data.monthTx.variableExpenses)
  const totalBudgetCents = totalBudgetEuros * 100
  const remainingCents = totalBudgetCents - variableSpentCents
  const spentFraction = totalBudgetCents > 0 ? variableSpentCents / totalBudgetCents : 0
  const status = budgetStatus(spentFraction)
  const elapsedFraction = periodElapsedFraction(currentMonth)
  const pace = computePace(spentFraction, elapsedFraction)

  return (
    <div className="screen-root">
      <Header title={periodLabel(currentMonth)} onOpenSettings={onOpenSettings} />
      <div className={`screen-pad ${styles.wrap}`}>
        {hasBudget ? (
          <div className={`card ${styles.mainCard}`}>
            <div className={styles.mainLabel}>{t.home.canStillSpend}</div>
            <div
              className={styles.mainAmount}
              style={{ color: remainingCents < 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
            >
              {formatCents(remainingCents)}
            </div>
            <ProgressBar fraction={spentFraction} status={status} />
            <div className={styles.mainSub}>
              {t.home.spentOfBudget(formatCents(variableSpentCents), formatCents(totalBudgetCents))}
            </div>
            <div className={styles.paceRow}>
              <span
                className={`pill pill-${pace.status}`}
                style={{ padding: '4px 10px', borderRadius: 999 }}
              >
                {t.pace[pace.messageKey]}
              </span>
            </div>
            {data.savingsPlan && (
              <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
                {t.home.savingsTargetLine(
                  formatEuros(data.savingsPlan.amountEuros),
                  data.savingsPlanGoal?.name ?? data.savingsPlan.motivation
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={`card`}>
            <div className={styles.observeEmoji}>👀</div>
            <div className={styles.observeTitle}>{t.home.observeModeTitle}</div>
            <div className={styles.observeText}>{t.home.observeModeText}</div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => onNavigate('budget')}
            >
              {t.home.goToBudget}
            </button>
          </div>
        )}

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
