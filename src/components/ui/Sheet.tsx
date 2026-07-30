import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Sheet.module.css'
import { IconClose } from '../Icons'
import { useT } from '../../i18n'

interface Props {
  title?: string
  onClose: () => void
  children: ReactNode
  variant?: 'bottom' | 'full'
  hideHeader?: boolean
  /** When controlled by the parent (e.g. after a save/confirm action), forces the exit animation. */
  closing?: boolean
}

export function Sheet({ title, onClose, children, variant = 'bottom', hideHeader, closing }: Props) {
  const t = useT()
  const [internalClosing, setInternalClosing] = useState(false)
  const isClosing = closing || internalClosing

  // Keep the latest onClose without making the fallback effect below depend
  // on an unstable callback identity.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const finishedRef = useRef(false)

  function finishClose() {
    if (finishedRef.current) return
    finishedRef.current = true
    onCloseRef.current()
  }

  // Fallback in case animationend never fires (e.g. reduced-motion edge
  // cases): still guarantees the parent unmounts this sheet.
  useEffect(() => {
    if (!isClosing) return
    const timer = setTimeout(finishClose, 400)
    return () => clearTimeout(timer)
  }, [isClosing])

  function requestClose() {
    setInternalClosing(true)
  }

  return (
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
      onClick={requestClose}
    >
      <div className={styles.backdropInner}>
        <div
          className={`${variant === 'full' ? styles.panelFull : styles.panel} ${
            isClosing ? (variant === 'full' ? styles.panelFullClosing : styles.panelClosing) : ''
          }`}
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={(e) => {
            if (isClosing && e.target === e.currentTarget) finishClose()
          }}
        >
          {variant === 'bottom' && <div className={styles.grabber} />}
          {!hideHeader && (
            <div className={styles.header}>
              <div className={styles.title}>{title}</div>
              <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label={t.common.close}>
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
