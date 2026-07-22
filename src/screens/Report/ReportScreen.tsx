import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { MonthSelector } from '../../components/MonthSelector'
import { DonutChart } from '../../components/charts/DonutChart'
import { IncomeExpenseChart } from '../../components/charts/IncomeExpenseChart'
import { TrendChart } from '../../components/charts/TrendChart'
import styles from './ReportScreen.module.css'
import { db } from '../../db/db'
import { getMonthTransactions, groupByCategory, sumCents } from '../../lib/stats'
import { lastNMonths } from '../../lib/dates'
import { currentPeriodKey, periodLabelShort } from '../../lib/period'
import { useT } from '../../i18n'

interface Props {
  onOpenSettings: () => void
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function ReportScreen({ onOpenSettings }: Props) {
  const t = useT()
  const [month, setMonth] = useState(currentPeriodKey())
  const [trendCategoryId, setTrendCategoryId] = useState<string | null>(null)

  const last6 = useMemo(() => lastNMonths(month, 6), [month])

  const data = useLiveQuery(async () => {
    const categories = await db.categories.toArray()
    const expenseCategories = categories
      .filter((c) => c.kind === 'expense' && !c.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const monthlyStats = await Promise.all(
      last6.map(async (m) => {
        const tx = await getMonthTransactions(m)
        return {
          monthKey: m,
          entrateCents: sumCents(tx.incomes),
          usciteCents: sumCents(tx.expenses),
          expensesByCategory: groupByCategory(tx.expenses),
        }
      })
    )

    const currentMonthStats = monthlyStats[monthlyStats.length - 1]
    return { categories, expenseCategories, monthlyStats, currentMonthStats }
  }, [last6.join(','), month])

  if (!data) return null

  const categoryById = new Map(data.categories.map((c) => [c.id, c]))
  const activeTrendCategoryId = trendCategoryId ?? data.expenseCategories[0]?.id ?? null

  const donutData = Array.from(data.currentMonthStats.expensesByCategory.entries())
    .map(([catId, valueCents]) => {
      const cat = categoryById.get(catId)
      return {
        id: catId,
        name: cat?.name ?? t.common.other,
        emoji: cat?.emoji ?? '❓',
        color: cat?.color ?? '#898781',
        valueCents,
      }
    })
    .sort((a, b) => b.valueCents - a.valueCents)

  const donutTotal = donutData.reduce((sum, d) => sum + d.valueCents, 0)

  const incomeExpenseData = data.monthlyStats.map((s) => ({
    monthKey: s.monthKey,
    monthShortLabel: periodLabelShort(s.monthKey),
    entrateCents: s.entrateCents,
    usciteCents: s.usciteCents,
  }))

  const trendData = data.monthlyStats.map((s) => ({
    monthKey: s.monthKey,
    monthShortLabel: periodLabelShort(s.monthKey),
    valueCents: activeTrendCategoryId ? (s.expensesByCategory.get(activeTrendCategoryId) ?? 0) : 0,
  }))

  const currentEntrate = data.currentMonthStats.entrateCents
  const currentUscite = data.currentMonthStats.usciteCents
  const savingsRateMonth = currentEntrate > 0 ? (currentEntrate - currentUscite) / currentEntrate : null

  const ratedMonths = data.monthlyStats.filter((s) => s.entrateCents > 0)
  const savingsRateAvg =
    ratedMonths.length > 0
      ? ratedMonths.reduce((sum, s) => sum + (s.entrateCents - s.usciteCents) / s.entrateCents, 0) /
        ratedMonths.length
      : null

  const trendCategory = activeTrendCategoryId ? categoryById.get(activeTrendCategoryId) : null

  return (
    <div className="screen-root">
      <Header title={t.nav.report} onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <MonthSelector month={month} onChange={setMonth} disableFuture={false} />

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.report.savingsRate}</div>
            <div
              className={styles.statValue}
              style={{
                color:
                  savingsRateMonth !== null && savingsRateMonth < 0
                    ? 'var(--status-critical)'
                    : 'var(--status-good-text)',
              }}
            >
              {savingsRateMonth !== null ? formatPercent(savingsRateMonth) : t.common.notAvailable}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.report.avg6Months}</div>
            <div className={styles.statValue}>
              {savingsRateAvg !== null ? formatPercent(savingsRateAvg) : t.common.notAvailable}
            </div>
          </div>
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t.report.expensesByCategory}</span>
          </div>
          <DonutChart data={donutData} totalCents={donutTotal} />
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t.report.incomeVsExpenses6m}</span>
          </div>
          <IncomeExpenseChart data={incomeExpenseData} />
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t.report.categoryTrend}</span>
            <select
              className={styles.catSelect}
              value={activeTrendCategoryId ?? ''}
              onChange={(e) => setTrendCategoryId(e.target.value)}
            >
              {data.expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <TrendChart data={trendData} color={trendCategory?.color} />
        </div>
      </div>
    </div>
  )
}
