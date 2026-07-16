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
import { currentMonthKey, lastNMonths, monthLabelShort } from '../../lib/dates'

interface Props {
  onOpenSettings: () => void
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function ReportScreen({ onOpenSettings }: Props) {
  const [month, setMonth] = useState(currentMonthKey())
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
        name: cat?.name ?? 'Altro',
        emoji: cat?.emoji ?? '❓',
        color: cat?.color ?? '#898781',
        valueCents,
      }
    })
    .sort((a, b) => b.valueCents - a.valueCents)

  const donutTotal = donutData.reduce((sum, d) => sum + d.valueCents, 0)

  const incomeExpenseData = data.monthlyStats.map((s) => ({
    monthKey: s.monthKey,
    monthShortLabel: monthLabelShort(s.monthKey),
    entrateCents: s.entrateCents,
    usciteCents: s.usciteCents,
  }))

  const trendData = data.monthlyStats.map((s) => ({
    monthKey: s.monthKey,
    monthShortLabel: monthLabelShort(s.monthKey),
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
    <div>
      <Header title="Report" onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <MonthSelector month={month} onChange={setMonth} disableFuture={false} />

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Tasso di risparmio</div>
            <div
              className={styles.statValue}
              style={{
                color:
                  savingsRateMonth !== null && savingsRateMonth < 0
                    ? 'var(--status-critical)'
                    : 'var(--status-good-text)',
              }}
            >
              {savingsRateMonth !== null ? formatPercent(savingsRateMonth) : 'N/D'}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Media 6 mesi</div>
            <div className={styles.statValue}>
              {savingsRateAvg !== null ? formatPercent(savingsRateAvg) : 'N/D'}
            </div>
          </div>
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>Spese per categoria</span>
          </div>
          <DonutChart data={donutData} totalCents={donutTotal} />
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>Entrate vs uscite (6 mesi)</span>
          </div>
          <IncomeExpenseChart data={incomeExpenseData} />
        </div>

        <div className={`card ${styles.sectionCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>Andamento categoria</span>
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
