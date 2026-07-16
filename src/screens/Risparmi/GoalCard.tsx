import styles from './GoalCard.module.css'
import { Ring } from '../../components/ui/Ring'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { IconEdit } from '../../components/Icons'
import { formatCents } from '../../lib/money'
import { monthLabel, currentMonthKey, lastNMonths, monthDiff, addMonths } from '../../lib/dates'
import { averageMonthlyContribution } from '../../lib/stats'
import { useT } from '../../i18n'
import type { Goal, Contribution } from '../../db/types'

interface Props {
  goal: Goal
  savedCents: number
  contributions: Contribution[]
  onEdit: () => void
  onAddContribution: () => void
}

export function GoalCard({ goal, savedCents, contributions, onEdit, onAddContribution }: Props) {
  const t = useT()
  const fraction = goal.targetCents > 0 ? savedCents / goal.targetCents : 0
  const remainingCents = Math.max(0, goal.targetCents - savedCents)
  const nowKey = currentMonthKey()
  const last3Months = lastNMonths(nowKey, 3)
  const avgMonthlyCents = averageMonthlyContribution(contributions, last3Months)

  // Prefer a single, most-relevant line of guidance (deadline pace takes priority
  // over the generic projection) so the card height stays constant regardless of copy.
  let noteText: string
  let deadlinePassed = false
  if (remainingCents <= 0) {
    noteText = t.goalCard.reached
  } else if (goal.deadline && monthDiff(nowKey, goal.deadline) < 0) {
    // Deadline already passed and the goal isn't reached: a €/month pace computed
    // with monthsLeft clamped to 1 would misleadingly suggest "just save X more
    // this month" instead of surfacing that the target date was missed.
    deadlinePassed = true
    noteText = t.goalCard.deadlinePassed
  } else if (goal.deadline) {
    const monthsLeft = Math.max(1, monthDiff(nowKey, goal.deadline))
    const perMonth = Math.ceil(remainingCents / monthsLeft / 100) * 100
    noteText = t.goalCard.byDeadline(monthLabel(goal.deadline), formatCents(perMonth))
  } else if (avgMonthlyCents > 0) {
    const monthsToGo = Math.ceil(remainingCents / avgMonthlyCents)
    const reachMonth = addMonths(nowKey, monthsToGo)
    noteText = t.goalCard.projection(monthLabel(reachMonth))
  } else {
    noteText = t.goalCard.addContributionsForProjection
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.top}>
        <Ring fraction={fraction} size={44} stroke={5} color="var(--series-5)">
          <span style={{ fontSize: 16 }}>{goal.emoji}</span>
        </Ring>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{goal.name}</span>
            <button type="button" className={styles.editBtn} onClick={onEdit} aria-label={t.goalCard.editGoalAriaLabel}>
              <IconEdit width={14} height={14} />
            </button>
          </div>
          <div className={styles.amounts}>
            {t.common.amountOfTarget(formatCents(savedCents), formatCents(goal.targetCents))}
          </div>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <ProgressBar fraction={fraction} status="good" height={5} />
      </div>

      <div className={`${styles.projection} ${deadlinePassed ? 'pill pill-warning' : ''}`}>
        {deadlinePassed ? `⚠️ ${noteText}` : noteText}
      </div>

      <div className={styles.actionsRow}>
        <button type="button" className="btn btn-primary btn-block" onClick={onAddContribution}>
          {t.goalCard.addContribution}
        </button>
      </div>
    </div>
  )
}
