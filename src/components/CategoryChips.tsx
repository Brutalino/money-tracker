import styles from './CategoryChips.module.css'
import type { Category } from '../db/types'

interface Props {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
  layout?: 'grid' | 'scroll' | 'scroll2'
}

const LAYOUT_CLASS: Record<'grid' | 'scroll' | 'scroll2', string> = {
  grid: styles.grid,
  scroll: styles.scroll,
  scroll2: styles.scroll2,
}

export function CategoryChips({ categories, selectedId, onSelect, layout = 'grid' }: Props) {
  return (
    <div className={LAYOUT_CLASS[layout]}>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`${styles.chip} ${selectedId === c.id ? styles.chipSelected : ''}`}
          style={{ ['--chip-color' as string]: c.color }}
          onClick={() => onSelect(c.id)}
        >
          <span className={styles.chipEmoji}>{c.emoji}</span>
          <span className={styles.chipLabel}>{c.name}</span>
        </button>
      ))}
    </div>
  )
}
