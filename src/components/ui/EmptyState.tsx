import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  emoji: string
  title: string
  subtitle?: string
  action?: ReactNode
}

export function EmptyState({ emoji, title, subtitle, action }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.emoji}>{emoji}</div>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {action}
    </div>
  )
}
