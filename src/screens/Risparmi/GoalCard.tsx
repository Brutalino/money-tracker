import styles from './GoalCard.module.css'
import { Ring } from '../../components/ui/Ring'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { IconEdit } from '../../components/Icons'
import { formatCents } from '../../lib/money'
import { monthLabel, currentMonthKey, lastNMonths, monthDiff, addMonths } from '../../lib/dates'
import { averageMonthlyContribution } from '../../lib/stats'
import type { Goal, Contribution } from '../../db/types'

interface Props {
  goal: Goal
  savedCents: number
  contributions: Contribution[]
  onEdit: () => void
  onAddContribution: () => void
}

export function GoalCard({ goal, savedCents, contributions, onEdit, onAddContribution }: Props) {
  const fraction = goal.targetCents > 0 ? savedCents / goal.targetCents : 0
  const remainingCents = Math.max(0, goal.targetCents - savedCents)
  const nowKey = currentMonthKey()
  const last3Months = lastNMonths(nowKey, 3)
  const avgMonthlyCents = averageMonthlyContribution(contributions, last3Months)

  let projectionText: string
  if (remainingCents <= 0) {
    projectionText = 'Obiettivo raggiunto! 🎉'
  } else if (avgMonthlyCents > 0) {
    const monthsToGo = Math.ceil(remainingCents / avgMonthlyCents)
    const reachMonth = addMonths(nowKey, monthsToGo)
    projectionText = `Di questo passo lo raggiungi a ${monthLabel(reachMonth)}`
  } else {
    projectionText = 'Aggiungi contributi per vedere una proiezione'
  }

  let deadlineText: string | null = null
  if (goal.deadline && remainingCents > 0) {
    const monthsLeft = Math.max(1, monthDiff(nowKey, goal.deadline))
    const perMonth = Math.ceil(remainingCents / monthsLeft / 100) * 100
    deadlineText = `Per arrivarci entro ${monthLabel(goal.deadline)} servono ${formatCents(perMonth)}/mese`
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.top}>
        <Ring fraction={fraction} size={60} stroke={7} color="var(--series-5)">
          <span style={{ fontSize: 22 }}>{goal.emoji}</span>
        </Ring>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{goal.name}</span>
            <button type="button" className={styles.editBtn} onClick={onEdit} aria-label="Modifica obiettivo">
              <IconEdit width={16} height={16} />
            </button>
          </div>
          <div className={styles.amounts}>
            {formatCents(savedCents)} di {formatCents(goal.targetCents)}
          </div>
          {goal.deadline && <div className={styles.deadline}>Scadenza: {monthLabel(goal.deadline)}</div>}
        </div>
      </div>

      <div className={styles.progressWrap}>
        <ProgressBar fraction={fraction} status="good" />
      </div>

      <div className={styles.projection}>
        {projectionText}
        {deadlineText && (
          <>
            <br />
            {deadlineText}
          </>
        )}
      </div>

      <div className={styles.actionsRow}>
        <button type="button" className="btn btn-primary btn-block" onClick={onAddContribution}>
          + Aggiungi contributo
        </button>
      </div>
    </div>
  )
}
