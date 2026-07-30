import { useRef, useState } from 'react'
import { Sheet } from './ui/Sheet'
import styles from './WelcomeSheet.module.css'
import { useT } from '../i18n'

interface Props {
  onOpenGuide: () => void
  onSkip: () => void
}

// Fixed emoji per bullet row, in order — content itself comes from
// t.welcome.bullet1/2/3, keeping this component free of hardcoded copy.
const BULLET_EMOJI = ['⚡', '🎯', '🔒']

export function WelcomeSheet({ onOpenGuide, onSkip }: Props) {
  const t = useT()
  const bullets = [t.welcome.bullet1, t.welcome.bullet2, t.welcome.bullet3]
  const [closing, setClosing] = useState(false)
  // Two distinct actions can dismiss this sheet; remember which one the
  // user picked so it fires only after the exit animation finishes.
  const pendingActionRef = useRef<() => void>(onSkip)

  function handleOpenGuide() {
    pendingActionRef.current = onOpenGuide
    setClosing(true)
  }

  function handleSkip() {
    pendingActionRef.current = onSkip
    setClosing(true)
  }

  return (
    <Sheet hideHeader closing={closing} onClose={() => pendingActionRef.current()}>
      <div className={styles.wrap}>
        <div className={styles.emoji}>💶</div>
        <div className={styles.title}>{t.welcome.title}</div>
        <p className={styles.subtitle}>{t.welcome.subtitle}</p>

        <div className={styles.bullets}>
          {bullets.map((text, i) => (
            <div key={i} className={styles.bulletRow}>
              <span className={styles.bulletEmoji}>{BULLET_EMOJI[i]}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-block" onClick={handleOpenGuide}>
            {t.welcome.openGuide}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={handleSkip}>
            {t.welcome.skip}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
