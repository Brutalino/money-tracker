import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { TransactionRow } from '../../components/TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { QuickEntrySheet } from '../../components/QuickEntry/QuickEntrySheet'
import styles from './CategoryDetailSheet.module.css'
import { db } from '../../db/db'
import { getMonthTransactions, sumCents } from '../../lib/stats'
import { periodLabel } from '../../lib/period'
import { formatCents } from '../../lib/money'
import { useT } from '../../i18n'
import type { Transaction } from '../../db/types'

interface Props {
  categoryId: string
  month: string
  onClose: () => void
}

type SortKey = 'amount' | 'date'
interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

export function CategoryDetailSheet({ categoryId, month, onClose }: Props) {
  const t = useT()
  const [sort, setSort] = useState<SortState>({ key: 'amount', dir: 'desc' })
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const data = useLiveQuery(async () => {
    const [monthTx, category] = await Promise.all([
      getMonthTransactions(month),
      db.categories.get(categoryId),
    ])
    return {
      expenses: monthTx.expenses.filter((tx) => tx.categoryId === categoryId),
      category,
    }
  }, [month, categoryId])

  if (!data) return null

  const categoryName = data.category?.name ?? t.common.other
  const categoryEmoji = data.category?.emoji ?? '❓'
  const categoryColor = data.category?.color ?? '#898781'
  const totalCents = sumCents(data.expenses)

  const sorted = [...data.expenses].sort((a, b) => {
    if (sort.key === 'amount') {
      if (a.amountCents !== b.amountCents) {
        return sort.dir === 'asc' ? a.amountCents - b.amountCents : b.amountCents - a.amountCents
      }
      // Tie-break by date, descending, for a deterministic order.
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    }
    if (a.date !== b.date) {
      return sort.dir === 'asc' ? (a.date < b.date ? -1 : 1) : a.date < b.date ? 1 : -1
    }
    // Tie-break by amount, descending, for a deterministic order.
    return b.amountCents - a.amountCents
  })

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  const arrowFor = (key: SortKey) => (sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '')

  return (
    <>
      <Sheet variant="full" hideHeader onClose={onClose}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <button type="button" className={styles.backRow} onClick={onClose}>
              ‹ {t.nav.report}
            </button>

            <div className={styles.categoryRow}>
              <div className={styles.emoji} style={{ ['--cat-color' as string]: categoryColor }}>
                {categoryEmoji}
              </div>
              <div className={styles.categoryMain}>
                <div className={styles.categoryName}>{categoryName}</div>
                <div className={styles.categorySub}>
                  {periodLabel(month)} · {t.report.expenseCount(data.expenses.length)}
                </div>
              </div>
              <div className={styles.categoryTotal}>{formatCents(totalCents)}</div>
            </div>

            <div className={styles.sortRow}>
              <button
                type="button"
                className={`${styles.sortChip} ${sort.key === 'amount' ? styles.sortChipActive : ''}`}
                onClick={() => toggleSort('amount')}
              >
                {t.report.sortAmount}
                {arrowFor('amount')}
              </button>
              <button
                type="button"
                className={`${styles.sortChip} ${sort.key === 'date' ? styles.sortChipActive : ''}`}
                onClick={() => toggleSort('date')}
              >
                {t.report.sortDate}
                {arrowFor('date')}
              </button>
            </div>
          </div>

          <div className={styles.list}>
            {sorted.length === 0 ? (
              <div className="card">
                <EmptyState emoji="🧾" title={t.charts.noExpensesInCategory} />
              </div>
            ) : (
              <div className="card" style={{ padding: '2px 14px' }}>
                {sorted.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={data.category}
                    showDate
                    onClick={() => setEditingTx(tx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Sheet>
      {editingTx && <QuickEntrySheet editingTransaction={editingTx} onClose={() => setEditingTx(null)} />}
    </>
  )
}
