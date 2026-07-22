import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { IconBack, IconChevronRight } from '../../components/Icons'
import styles from './GuideScreen.module.css'
import { useT } from '../../i18n'
import type { TranslationKeys } from '../../i18n/types'

interface Props {
  onClose: () => void
}

type SectionId = keyof TranslationKeys['guide']['sections']

// Fixed display order + emoji per section. Content itself comes from
// t.guide.sections, keeping this component free of hardcoded copy.
const SECTION_ORDER: { id: SectionId; emoji: string }[] = [
  { id: 'gettingStarted', emoji: '🚀' },
  { id: 'startingOut', emoji: '🧭' },
  { id: 'home', emoji: '🏠' },
  { id: 'addTransaction', emoji: '➕' },
  { id: 'spese', emoji: '🧾' },
  { id: 'recurring', emoji: '🔁' },
  { id: 'budget', emoji: '🎯' },
  { id: 'risparmi', emoji: '🐷' },
  { id: 'report', emoji: '📊' },
  { id: 'settings', emoji: '⚙️' },
]

export function GuideScreen({ onClose }: Props) {
  const t = useT()
  // Opened by default since the guide is often reached right after the
  // welcome sheet, where landing on an empty wall of collapsed rows would
  // be a poor first impression.
  const [openIds, setOpenIds] = useState<Set<SectionId>>(new Set(['gettingStarted']))

  function toggle(id: SectionId) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Sheet variant="full" hideHeader onClose={onClose}>
      <div className={styles.top}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label={t.common.back}>
          <IconBack width={18} height={18} />
        </button>
        <span className={styles.title}>{t.guide.title}</span>
      </div>

      <div className={styles.body}>
        <p className={`muted ${styles.intro}`}>{t.guide.intro}</p>

        {SECTION_ORDER.map(({ id, emoji }) => {
          const section = t.guide.sections[id]
          const isOpen = openIds.has(id)
          return (
            <div key={id} className={`card ${styles.sectionCard}`}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => toggle(id)}
                aria-expanded={isOpen}
              >
                <span className={styles.sectionEmoji}>{emoji}</span>
                <span className={styles.sectionTitle}>{section.title}</span>
                <IconChevronRight
                  width={16}
                  height={16}
                  className={styles.chevron}
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
                />
              </button>
              {isOpen && (
                <div className={styles.sectionBody}>
                  {section.body.map((paragraph, i) => (
                    <p key={i} className={styles.paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
