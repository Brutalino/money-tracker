import styles from './MonthSelector.module.css'
import { IconChevronLeft, IconChevronRight } from './Icons'
import { addMonths, currentMonthKey, monthLabel } from '../lib/dates'

interface Props {
  month: string
  onChange: (month: string) => void
  disableFuture?: boolean
}

export function MonthSelector({ month, onChange, disableFuture = true }: Props) {
  const isCurrentOrFuture = disableFuture && month >= currentMonthKey()
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mese precedente"
      >
        <IconChevronLeft width={18} height={18} />
      </button>
      <div className={styles.label}>{monthLabel(month)}</div>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(addMonths(month, 1))}
        disabled={isCurrentOrFuture}
        aria-label="Mese successivo"
      >
        <IconChevronRight width={18} height={18} />
      </button>
    </div>
  )
}
