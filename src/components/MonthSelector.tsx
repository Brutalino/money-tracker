import styles from './MonthSelector.module.css'
import { IconChevronLeft, IconChevronRight } from './Icons'
import { addMonths } from '../lib/dates'
import { currentPeriodKey, periodLabel } from '../lib/period'
import { useT } from '../i18n'

interface Props {
  month: string
  onChange: (month: string) => void
  disableFuture?: boolean
}

export function MonthSelector({ month, onChange, disableFuture = true }: Props) {
  const t = useT()
  const isCurrentOrFuture = disableFuture && month >= currentPeriodKey()
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(addMonths(month, -1))}
        aria-label={t.monthSelector.prevMonth}
      >
        <IconChevronLeft width={18} height={18} />
      </button>
      <div className={styles.label}>{periodLabel(month)}</div>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(addMonths(month, 1))}
        disabled={isCurrentOrFuture}
        aria-label={t.monthSelector.nextMonth}
      >
        <IconChevronRight width={18} height={18} />
      </button>
    </div>
  )
}
