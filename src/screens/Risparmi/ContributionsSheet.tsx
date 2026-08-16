import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconTrash } from '../../components/Icons'
import styles from './ContributionsSheet.module.css'
import { db } from '../../db/db'
import { sumContributionCents } from '../../lib/stats'
import { formatCents } from '../../lib/money'
import { dayMonthLabel, todayISO } from '../../lib/dates'
import { useT } from '../../i18n'
import type { Goal } from '../../db/types'

interface Props {
  goal: Goal
  onClose: () => void
}

export function ContributionsSheet({ goal, onClose }: Props) {
  const t = useT()

  const contributions = useLiveQuery(async () => {
    const all = await db.contributions.where('goalId').equals(goal.id).toArray()
    return all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [goal.id])

  async function handleDelete(id: string) {
    if (!confirm(t.contributionsList.confirmDelete)) return
    await db.contributions.delete(id)
  }

  const currentYear = todayISO().slice(0, 4)

  return (
    <Sheet title={t.contributionsList.title(goal.name)} onClose={onClose}>
      {!contributions ? null : contributions.length === 0 ? (
        <EmptyState emoji="🐷" title={t.contributionsList.empty} />
      ) : (
        <>
          <div className={styles.total}>
            {t.contributionsList.total(formatCents(sumContributionCents(contributions)))}
          </div>
          <div className={styles.list}>
            {contributions.map((c) => {
              const year = c.date.slice(0, 4)
              return (
                <div key={c.id} className={styles.row}>
                  <div className={styles.main}>
                    <div className={styles.date}>
                      {dayMonthLabel(c.date)}
                      {year !== currentYear ? ` ${year}` : ''}
                    </div>
                    {c.note && <div className={styles.note}>{c.note}</div>}
                  </div>
                  <div className={styles.amount}>{formatCents(c.amountCents)}</div>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(c.id)}
                    aria-label={t.contributionsList.deleteAriaLabel}
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}
