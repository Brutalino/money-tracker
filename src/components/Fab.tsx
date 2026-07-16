import styles from './Fab.module.css'
import { IconPlus } from './Icons'

interface Props {
  onClick: () => void
}

export function Fab({ onClick }: Props) {
  return (
    <button type="button" className={styles.fab} onClick={onClick} aria-label="Aggiungi transazione">
      <IconPlus width={26} height={26} />
    </button>
  )
}
