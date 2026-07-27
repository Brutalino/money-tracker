import { Sheet } from './ui/Sheet'
import styles from './WhatsNewSheet.module.css'
import { useT, useLanguage } from '../i18n'
import type { ChangelogEntry } from '../lib/changelog'

interface Props {
  entries: ChangelogEntry[]
  onClose: () => void
}

export function WhatsNewSheet({ entries, onClose }: Props) {
  const t = useT()
  const { language } = useLanguage()
  // Only label each block with its version when there's more than one entry
  // to tell apart — with a single entry the version is already in the
  // subtitle, so repeating it would just be noise.
  const showVersionLabels = entries.length > 1

  return (
    <Sheet hideHeader onClose={onClose}>
      <div className={styles.wrap}>
        <div className={styles.emoji}>✨</div>
        <div className={styles.title}>{t.whatsNew.title}</div>
        <p className={styles.subtitle}>{t.whatsNew.subtitle(__APP_VERSION__)}</p>

        <div className={styles.notes}>
          {entries.map((entry) => (
            <div key={entry.version} className={styles.entryBlock}>
              {showVersionLabels && <div className={styles.versionLabel}>v{entry.version}</div>}
              {entry.items[language].map((line, i) => (
                <div key={i} className={styles.bulletRow}>
                  <span className={styles.bullet}>•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          {t.whatsNew.gotIt}
        </button>
      </div>
    </Sheet>
  )
}
