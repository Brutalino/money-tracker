import { useId } from 'react'
import styles from './BalanceGauge.module.css'
import { formatCents } from '../../lib/money'
import { useT } from '../../i18n'

interface Props {
  balanceCents: number
  incomeCents: number
  spentCents: number
  setAsideCents: number
  denomCents: number
}

// Semicircular track: viewBox 0 0 200 110, flat baseline at y=102.
const ARC_PATH = 'M16 102 A84 84 0 0 1 184 102'

/**
 * Hero balance gauge: a semicircular arc showing how much of this month's
 * income has already been committed (spent + set aside), with the running
 * balance (including carryover) as the centered number.
 */
export function BalanceGauge({ balanceCents, incomeCents, spentCents, setAsideCents, denomCents }: Props) {
  const t = useT()
  const gradientId = useId()
  const usedCents = spentCents + setAsideCents

  let pct = 0
  let capped = false
  let sub: string | null = null

  if (denomCents > 0) {
    if (usedCents <= denomCents) {
      const rawPct = (usedCents / denomCents) * 100
      pct = rawPct
      if (incomeCents === 0) {
        sub = t.home.gaugeEstimated
      } else {
        const remainingPct = Math.round(100 - rawPct)
        sub = t.home.gaugeRemaining(remainingPct)
      }
    } else {
      pct = 100
      capped = true
      sub = balanceCents < 0 ? t.home.gaugeBelowZero(formatCents(Math.abs(balanceCents))) : t.home.gaugeOverspent
    }
  }

  const amountText = formatCents(balanceCents)
  // Owner's absolute requirement: the amount must never overlap the arc, so
  // the font size steps down as the formatted string gets longer.
  const amountSize = amountText.length <= 9 ? 26 : amountText.length <= 12 ? 21 : 17

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.arcWrap}>
        <svg viewBox="0 0 200 110" className={styles.arcSvg}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--series-5)" />
            </linearGradient>
          </defs>
          <path d={ARC_PATH} fill="none" stroke="var(--diverging-mid)" strokeWidth={13} strokeLinecap="round" />
          {pct > 0 && (
            // Only rendered once there's something to show: at pct=0 a round linecap
            // draws a stray dot at the arc's start even with a zero-length dash.
            <path
              d={ARC_PATH}
              fill="none"
              stroke={capped ? 'var(--status-critical)' : `url(#${gradientId})`}
              strokeWidth={13}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${pct} 100`}
              className={styles.valuePath}
            />
          )}
        </svg>
        <div className={styles.overlay}>
          <span className={styles.label}>{t.home.balance}</span>
          <span
            className={styles.amount}
            style={{
              fontSize: amountSize,
              color: balanceCents < 0 ? 'var(--status-critical)' : 'var(--text-primary)',
            }}
          >
            {amountText}
          </span>
          {sub && <span className={styles.sub}>{sub}</span>}
        </div>
      </div>
      <div className={styles.chipRow}>
        <span className={styles.chip}>
          {t.home.chipIncomeLabel} <strong>{formatCents(incomeCents)}</strong>
        </span>
        <span className={styles.chip}>
          {t.home.chipExpensesLabel} <strong>{formatCents(spentCents)}</strong>
        </span>
        {setAsideCents > 0 && (
          <span className={styles.chip}>
            {t.home.chipSetAsideLabel} <strong>{formatCents(setAsideCents)}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
