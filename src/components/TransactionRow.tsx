import styles from './TransactionRow.module.css'
import type { Transaction, Category } from '../db/types'
import { formatCentsCompact } from '../lib/money'

interface Props {
  transaction: Transaction
  category?: Category
  onClick?: () => void
}

export function TransactionRow({ transaction, category, onClick }: Props) {
  const isExpense = transaction.type === 'expense'
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
          <span className={styles.name}>{category?.name ?? 'Categoria'}</span>
          {transaction.recurringId && (
            <span className={styles.badge} title="Generata da costo fisso">
              🔁
            </span>
          )}
        </div>
        {transaction.note && <div className={styles.note}>{transaction.note}</div>}
      </div>
      <div className={`${styles.amount} ${isExpense ? styles.amountExpense : styles.amountIncome}`}>
        {isExpense ? '−' : '+'}
        {formatCentsCompact(transaction.amountCents)}
      </div>
    </button>
  )
}
