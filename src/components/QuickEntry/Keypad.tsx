import styles from './Keypad.module.css'

interface Props {
  onKey: (key: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back']

export function Keypad({ onKey }: Props) {
  return (
    <div className={styles.grid}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`${styles.key} ${k === 'back' ? styles.keyBack : ''}`}
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? 'Cancella' : k === ',' ? 'Virgola' : k}
        >
          {k === 'back' ? '⌫' : k}
        </button>
      ))}
    </div>
  )
}
