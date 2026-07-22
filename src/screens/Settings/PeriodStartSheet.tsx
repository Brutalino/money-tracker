import { Sheet } from '../../components/ui/Sheet'
import styles from './PeriodStartSheet.module.css'
import { usePeriodStartDay } from '../../period'
import { useT } from '../../i18n'

interface Props {
  onClose: () => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function PeriodStartSheet({ onClose }: Props) {
  const t = useT()
  const { periodStartDay, setPeriodStartDay } = usePeriodStartDay()

  function handleSelect(day: number) {
    setPeriodStartDay(day)
    onClose()
  }

  return (
    <Sheet title={t.settings.periodSheetTitle} onClose={onClose}>
      <p className={styles.explainer}>{t.settings.periodExplainer}</p>
      <div className={styles.grid}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            className={`${styles.dayBtn} ${day === periodStartDay ? styles.dayBtnActive : ''}`}
            onClick={() => handleSelect(day)}
          >
            {day}
          </button>
        ))}
      </div>
      <p className={styles.footnote}>{t.settings.periodFootnote}</p>
    </Sheet>
  )
}
