import type { ReactNode } from 'react'
import styles from './Header.module.css'
import { IconGear } from './Icons'
import { useT } from '../i18n'

interface Props {
  title: string
  subtitle?: string
  onOpenSettings: () => void
  right?: ReactNode
}

export function Header({ title, subtitle, onOpenSettings, right }: Props) {
  const t = useT()
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {right}
          <button
            type="button"
            className={styles.gearBtn}
            onClick={onOpenSettings}
            aria-label={t.header.settingsAriaLabel}
          >
            <IconGear width={20} height={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
