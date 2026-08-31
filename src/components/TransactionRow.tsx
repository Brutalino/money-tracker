import styles from './TransactionRow.module.css'
import type { Transaction, Category } from '../db/types'
import { formatCentsCompact } from '../lib/money'
import { todayISO, dayLabel } from '../lib/dates'
import { useT } from '../i18n'

interface Props {
  transaction: Transaction
  category?: Category
  onClick?: () => void
  /** Show the transaction's day label in the subline instead of just the note (used in single-category lists spanning multiple days, e.g. CategoryDetailSheet). */
  showDate?: boolean
}

export function TransactionRow({ transaction, category, onClick, showDate }: Props) {
  const t = useT()
  const isExpense = transaction.type === 'expense'
  const isScheduled = transaction.date > todayISO()
  const subline = showDate
    ? dayLabel(transaction.date) + (transaction.note ? ` · ${transaction.note}` : '')
    : transaction.note
  return (
    <button
      type="button"
      className={styles.row}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className={styles.emoji} style={{ ['--cat-color' as string]: category?.color }}>
        {category?.emoji ?? '❓'}
      </div>
      <div className={styles.main}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{category?.name ?? t.transactionRow.categoryFallback}</span>
          {transaction.recurringId && (
            <span className={styles.badge} title={t.transactionRow.generatedFromRecurring}>
              🔁
            </span>
          )}
          {isScheduled && <span className={styles.scheduledBadge}>{t.transactionRow.scheduled}</span>}
        </div>
        {subline && <div className={styles.note}>{subline}</div>}
      </div>
      <div className={`${styles.amount} ${isExpense ? styles.amountExpense : styles.amountIncome}`}>
        {isExpense ? '−' : '+'}
        {formatCentsCompact(transaction.amountCents)}
      </div>
    </button>
  )
}
