import styles from './Fab.module.css'
import { IconPlus } from './Icons'
import { useT } from '../i18n'

interface Props {
  onClick: () => void
}

export function Fab({ onClick }: Props) {
  const t = useT()
  return (
    <button type="button" className={styles.fab} onClick={onClick} aria-label={t.fab.addTransaction}>
      <IconPlus width={22} height={22} />
    </button>
  )
}
