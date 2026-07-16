import styles from './ProgressBar.module.css'
import type { PaceStatus } from '../../lib/stats'

const STATUS_COLOR: Record<PaceStatus, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning-bg)',
  critical: 'var(--status-critical)',
}

interface Props {
  fraction: number // 0..1+
  status: PaceStatus
  height?: number
}

export function ProgressBar({ fraction, status, height }: Props) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div className={styles.track} style={height ? { height } : undefined}>
      <div
        className={styles.fill}
        style={{ width: `${pct}%`, background: STATUS_COLOR[status] }}
      />
    </div>
  )
}
