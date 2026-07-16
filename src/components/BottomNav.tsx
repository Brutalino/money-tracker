import styles from './BottomNav.module.css'
import { IconHome, IconList, IconTarget, IconPiggy, IconChart } from './Icons'
import type { TabKey } from '../types/nav'
import { useT } from '../i18n'

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export function BottomNav({ active, onChange }: Props) {
  const t = useT()
  const TABS: Array<{ key: TabKey; label: string; Icon: typeof IconHome }> = [
    { key: 'home', label: t.nav.home, Icon: IconHome },
    { key: 'spese', label: t.nav.expenses, Icon: IconList },
    { key: 'budget', label: t.nav.budget, Icon: IconTarget },
    { key: 'risparmi', label: t.nav.savings, Icon: IconPiggy },
    { key: 'report', label: t.nav.report, Icon: IconChart },
  ]
  return (
    <nav className={styles.nav} aria-label={t.nav.ariaLabel}>
      <div className={styles.inner}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`${styles.item} ${active === key ? styles.active : ''}`}
            onClick={() => onChange(key)}
            aria-current={active === key ? 'page' : undefined}
          >
            <Icon width={20} height={20} />
            <span className={styles.label}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
