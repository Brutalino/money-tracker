import styles from './CategoryChips.module.css'
import type { Category } from '../db/types'

interface Props {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
  layout?: 'grid' | 'scroll'
}

export function CategoryChips({ categories, selectedId, onSelect, layout = 'grid' }: Props) {
  return (
    <div className={layout === 'grid' ? styles.grid : styles.scroll}>
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
