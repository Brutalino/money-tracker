import styles from './BottomNav.module.css'
import { IconHome, IconList, IconTarget, IconPiggy, IconChart } from './Icons'
import type { TabKey } from '../types/nav'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof IconHome }> = [
  { key: 'home', label: 'Home', Icon: IconHome },
  { key: 'spese', label: 'Spese', Icon: IconList },
  { key: 'budget', label: 'Budget', Icon: IconTarget },
  { key: 'risparmi', label: 'Risparmi', Icon: IconPiggy },
  { key: 'report', label: 'Report', Icon: IconChart },
]

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className={styles.nav} aria-label="Navigazione principale">
      <div className={styles.inner}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`${styles.item} ${active === key ? styles.active : ''}`}
            onClick={() => onChange(key)}
            aria-current={active === key ? 'page' : undefined}
          >
            <Icon width={22} height={22} />
            <span className={styles.label}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
