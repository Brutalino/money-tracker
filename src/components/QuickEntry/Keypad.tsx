import styles from './Keypad.module.css'
import { useT } from '../../i18n'
import { decimalSeparator } from '../../lib/locale'

interface Props {
  onKey: (key: string) => void
}

export function Keypad({ onKey }: Props) {
  const t = useT()
  const sep = decimalSeparator()
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', sep, '0', 'back']

  return (
    <div className={styles.grid}>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className={`${styles.key} ${k === 'back' ? styles.keyBack : ''}`}
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? t.keypad.deleteAriaLabel : k === sep ? t.keypad.decimalAriaLabel : k}
        >
          {k === 'back' ? '⌫' : k}
        </button>
      ))}
    </div>
  )
}
