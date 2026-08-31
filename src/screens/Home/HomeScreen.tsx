import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Ring } from '../../components/ui/Ring'
import { BalanceGauge } from './BalanceGauge'
import styles from './HomeScreen.module.css'
import { db } from '../../db/db'
import {
  getMonthTransactions,
  getBudgetsForMonth,
  sumBudgetEuros,
  sumCents,
  budgetStatus,
  groupByCategory,
  getPeriodContributions,
  sumContributionCents,
  balanceUpToPeriodCents,
  averageMonthlyIncomeCents,
  variableSpendingAverages,
  averageMonthlyContribution,
  computePace,
} from '../../lib/stats'
import { currentPeriodKey, periodLabel, periodElapsedFraction, periodStartISO } from '../../lib/period'
import { monthLabel, lastNMonths, addMonths, todayISO, parseISODate } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import { localeTag } from '../../lib/locale'
import { useT } from '../../i18n'
import type { TabKey } from '../../types/nav'
import type { Contribution } from '../../db/types'

interface Props {
  onOpenSettings: () => void
  onNavigate: (tab: TabKey) => void
}

/** Plain locale-formatted euro amount, no currency symbol (the caller's
 * i18n string supplies a literal " €" / "€" itself where needed). */
function formatPlainEuros(cents: number): string {
  return (cents / 100).toLocaleString(localeTag(), {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function HomeScreen({ onOpenSettings, onNavigate }: Props) {
  const t = useT()
  const currentMonth = currentPeriodKey()

  const data = useLiveQuery(async () => {
    const [monthTx, budgets, categories, goalsAll, periodContributions, balanceCents, avgIncomeCents] =
      await Promise.all([
        getMonthTransactions(currentMonth),
        getBudgetsForMonth(currentMonth),
        db.categories.toArray(),
        db.goals.toArray(),
        getPeriodContributions(currentMonth),
        balanceUpToPeriodCents(currentMonth),
        averageMonthlyIncomeCents(currentMonth),
      ])

    // The legacy `archived` flag is deliberately ignored — see RisparmiScreen.
    const goals = [...goalsAll].sort((a, b) => a.sortOrder - b.sortOrder)
    const savedByGoal = new Map<string, number>()
    const contributionsByGoal = new Map<string, Contribution[]>()
    for (const g of goals) {
      const contribs = await db.contributions.where('goalId').equals(g.id).toArray()
      contributionsByGoal.set(g.id, contribs)
      savedByGoal.set(g.id, sumContributionCents(contribs))
    }

    const expenseCategoryIds = categories.filter((c) => c.kind === 'expense').map((c) => c.id)
    const { averagesCents, monthsWithData } = await variableSpendingAverages(currentMonth, expenseCategoryIds)

    return {
      monthTx,
      budgets,
      categories,
      goals,
      savedByGoal,
      contributionsByGoal,
      periodContributions,
      balanceCents,
      avgIncomeCents,
      averagesCents,
      monthsWithData,
    }
  }, [currentMonth])

  if (!data) return null

  const categoryById = new Map(data.categories.map((c) => [c.id, c]))

  // --- Balance gauge ---
  const incomeCents = sumCents(data.monthTx.incomes)
  const spentCents = sumCents(data.monthTx.expenses)
  const setAsideCents = sumContributionCents(data.periodContributions)
  const denomCents = incomeCents > 0 ? incomeCents : data.avgIncomeCents

  // --- Pace card ---
  const variableSpentCents = sumCents(data.monthTx.variableExpenses)
  const elapsed = periodElapsedFraction(currentMonth)
  const dayOfPeriod =
    Math.round(
      (parseISODate(todayISO()).getTime() - parseISODate(periodStartISO(currentMonth)).getTime()) / 86_400_000
    ) + 1
  const paceDenomCents =
    data.budgets.length > 0
      ? sumBudgetEuros(data.budgets) * 100
      : data.monthsWithData > 0
        ? Array.from(data.averagesCents.values()).reduce((sum, v) => sum + v, 0)
        : null
  const spentFraction = paceDenomCents !== null && paceDenomCents > 0 ? variableSpentCents / paceDenomCents : 0
  const pace = computePace(spentFraction, elapsed)
  // Rounded to the nearest 10€ (1000 cents).
  const projectedCents = elapsed > 0 ? Math.round(variableSpentCents / elapsed / 1000) * 1000 : 0

  // --- Budget watch ---
  const variableByCategory = groupByCategory(data.monthTx.variableExpenses)
  const watchRows = data.budgets
    .filter((b) => b.amountEuros > 0)
    .map((b) => {
      const spent = variableByCategory.get(b.categoryId) ?? 0
      const budgetCents = b.amountEuros * 100
      const fraction = budgetCents > 0 ? spent / budgetCents : 0
      return { budget: b, spent, budgetCents, fraction }
    })
    .filter((r) => r.fraction >= 0.5)
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, 2)

  // --- Goals ---
  const goalCount = data.goals.length
  const totalSavedCents = data.goals.reduce((sum, g) => sum + (data.savedByGoal.get(g.id) ?? 0), 0)
  const last3Months = lastNMonths(currentMonth, 3)

  return (
    <div className="screen-root">
      <Header title={periodLabel(currentMonth)} onOpenSettings={onOpenSettings} />
      <div className={`screen-pad ${styles.wrap}`}>
        <BalanceGauge
          balanceCents={data.balanceCents}
          incomeCents={incomeCents}
          spentCents={spentCents}
          setAsideCents={setAsideCents}
          denomCents={denomCents}
        />

        <div className="card">
          <div className={styles.cardTitle}>{t.home.paceTitle}</div>
          {dayOfPeriod < 4 ? (
            <div className={`muted ${styles.paceTooEarly}`}>{t.home.paceTooEarly}</div>
          ) : (
            <>
              <div className={styles.paceRow}>
                <span className={styles.paceLabel}>
                  {t.home.paceVariableLabel}: <strong>{formatCents(variableSpentCents)}</strong>
                </span>
                {paceDenomCents !== null && (
                  <span className={`pill pill-${pace.status} ${styles.pacePill}`}>{t.pace[pace.messageKey]}</span>
                )}
              </div>
              {paceDenomCents !== null && (
                <div className={styles.paceBarWrap}>
                  <ProgressBar fraction={spentFraction} status={pace.status} height={8} />
                  <div className={styles.paceMarker} style={{ left: `${Math.min(100, elapsed * 100)}%` }} />
                </div>
              )}
              <div className={styles.paceProjection}>{t.home.paceProjection(formatCents(projectedCents))}</div>
            </>
          )}
        </div>

        {watchRows.length > 0 && (
          <button type="button" className={`card ${styles.cardBtn}`} onClick={() => onNavigate('budget')}>
            <div className={styles.cardTitle}>{t.home.budgetWatchTitle}</div>
            <div className={styles.watchRows}>
              {watchRows.map(({ budget, spent, budgetCents, fraction }) => {
                const cat = categoryById.get(budget.categoryId)
                return (
                  <div key={budget.id} className={styles.watchRow}>
                    <div className={styles.watchTopRow}>
                      <span className={styles.watchName}>
                        {cat?.emoji} {cat?.name}
                      </span>
                      <span className={styles.watchAmount}>
                        {t.home.budgetWatchAmounts(formatPlainEuros(spent), formatPlainEuros(budgetCents))}
                      </span>
                    </div>
                    <ProgressBar fraction={fraction} status={budgetStatus(fraction)} height={6} />
                  </div>
                )
              })}
            </div>
          </button>
        )}

        {goalCount === 0 && (
          <button type="button" className={styles.ghostRow} onClick={() => onNavigate('risparmi')}>
            ＋ {t.home.createGoalInvite}
          </button>
        )}

        {goalCount === 1 &&
          (() => {
            const goal = data.goals[0]
            const saved = data.savedByGoal.get(goal.id) ?? 0
            const remaining = Math.max(0, goal.targetCents - saved)
            const reached = saved >= goal.targetCents
            const avgMonthlyCents = averageMonthlyContribution(
              data.contributionsByGoal.get(goal.id) ?? [],
              last3Months
            )
            let paceLine: string | null = null
            if (!reached && avgMonthlyCents > 0) {
              const monthsToGo = Math.ceil(remaining / avgMonthlyCents)
              const reachMonth = addMonths(currentMonth, monthsToGo)
              paceLine = t.home.goalPace(formatPlainEuros(avgMonthlyCents), monthLabel(reachMonth))
            }
            return (
              <button
                type="button"
                className={`card ${styles.cardBtn} ${styles.singleGoalCard}`}
                onClick={() => onNavigate('risparmi')}
              >
                <Ring
                  fraction={goal.targetCents > 0 ? saved / goal.targetCents : 0}
                  size={44}
                  stroke={5}
                  color="var(--series-5)"
                >
                  <span style={{ fontSize: 16 }}>{goal.emoji}</span>
                </Ring>
                <div className={styles.singleGoalInfo}>
                  <div className={styles.singleGoalName}>{goal.name}</div>
                  {reached ? (
                    <div className={styles.goalReached}>{t.home.goalReached}</div>
                  ) : (
                    <div className={styles.singleGoalSub}>
                      {t.home.goalSubLine(formatCents(saved), formatCents(goal.targetCents), formatCents(remaining))}
                    </div>
                  )}
                  {paceLine && <div className={styles.goalPaceLine}>{paceLine}</div>}
                </div>
              </button>
            )
          })()}

        {goalCount >= 2 && (
          <button
            type="button"
            className={`card ${styles.cardBtn}`}
            onClick={() => onNavigate('risparmi')}
          >
            <div className={styles.cardTitle}>{t.home.goalsMultiTitle(formatPlainEuros(totalSavedCents))}</div>
            <div className={styles.compactGoalRows}>
              {data.goals.slice(0, 3).map((g) => {
                const saved = data.savedByGoal.get(g.id) ?? 0
                const fraction = g.targetCents > 0 ? saved / g.targetCents : 0
                const reached = saved >= g.targetCents
                return (
                  <div key={g.id} className={styles.compactGoalRow}>
                    <div className={styles.compactGoalTop}>
                      <span className={styles.compactGoalName}>
                        {g.emoji} {g.name}
                      </span>
                      {reached ? (
                        <span className={styles.goalReachedInline}>{t.home.goalReached}</span>
                      ) : (
                        <span className={styles.compactGoalAmount}>
                          {t.home.goalsCompactAmounts(formatPlainEuros(saved), formatPlainEuros(g.targetCents))}
                        </span>
                      )}
                    </div>
                    <ProgressBar fraction={fraction} status="good" height={5} />
                  </div>
                )
              })}
            </div>
            {goalCount > 3 && <div className={styles.seeAllRow}>{t.home.seeAllGoals(goalCount)}</div>}
          </button>
        )}
      </div>
    </div>
  )
}
