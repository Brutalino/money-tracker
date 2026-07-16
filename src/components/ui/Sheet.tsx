import type { ReactNode } from 'react'
import styles from './Sheet.module.css'
import { IconClose } from '../Icons'

interface Props {
  title?: string
  onClose: () => void
  children: ReactNode
  variant?: 'bottom' | 'full'
  hideHeader?: boolean
}

export function Sheet({ title, onClose, children, variant = 'bottom', hideHeader }: Props) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.backdropInner}>
        <div
          className={variant === 'full' ? styles.panelFull : styles.panel}
          onClick={(e) => e.stopPropagation()}
        >
          {variant === 'bottom' && <div className={styles.grabber} />}
          {!hideHeader && (
            <div className={styles.header}>
              <div className={styles.title}>{title}</div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Chiudi">
                <IconClose width={18} height={18} />
              </button>
            </div>
          )}
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  )
}
