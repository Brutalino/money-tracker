import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { EmptyState } from '../../components/ui/EmptyState'
import { GoalCard } from './GoalCard'
import { GoalFormSheet } from './GoalFormSheet'
import { ContributionSheet } from './ContributionSheet'
import { IconPlus } from '../../components/Icons'
import styles from './RisparmiScreen.module.css'
import { db } from '../../db/db'
import { getMonthTransactions, sumCents, goalSavedCents } from '../../lib/stats'
import { currentMonthKey, monthLabel } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import type { Goal, Contribution } from '../../db/types'

interface Props {
  onOpenSettings: () => void
}

export function RisparmiScreen({ onOpenSettings }: Props) {
  const [goalSheet, setGoalSheet] = useState<{ item: Goal | null } | null>(null)
  const [contribGoal, setContribGoal] = useState<{ goal: Goal; initial?: number } | null>(null)

  const currentMonth = currentMonthKey()

  const data = useLiveQuery(async () => {
    const goalsAll = await db.goals.toArray()
    const goals = goalsAll.filter((g) => !g.archived).sort((a, b) => a.sortOrder - b.sortOrder)
    const contributionsByGoal = new Map<string, Contribution[]>()
    const savedByGoal = new Map<string, number>()
    for (const g of goals) {
      const contribs = await db.contributions.where('goalId').equals(g.id).toArray()
      contributionsByGoal.set(g.id, contribs)
      savedByGoal.set(g.id, await goalSavedCents(g.id))
    }
    const monthTx = await getMonthTransactions(currentMonth)
    const leftoverCents = sumCents(monthTx.incomes) - sumCents(monthTx.expenses)
    return { goals, contributionsByGoal, savedByGoal, leftoverCents }
  }, [currentMonth])

  if (!data) return null

  const topGoal = data.goals[0] ?? null

  return (
    <div className="screen-root">
      <Header title="Risparmi" onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <div className={`card ${styles.leftoverCard}`}>
          <div className={styles.leftoverLabel}>Avanzo di {monthLabel(currentMonth).split(' ')[0]}</div>
          <div
            className={styles.leftoverValue}
            style={{ color: data.leftoverCents < 0 ? 'var(--status-critical)' : 'var(--status-good-text)' }}
          >
            {formatCents(data.leftoverCents)}
          </div>
          <div className={styles.leftoverRow}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Entrate meno uscite di questo mese
            </span>
            {topGoal && data.leftoverCents > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '0 14px', minHeight: 38 }}
                onClick={() => setContribGoal({ goal: topGoal, initial: data.leftoverCents })}
              >
                Metti da parte
              </button>
            )}
          </div>
        </div>

        {data.goals.length === 0 ? (
          <div className="card">
            <EmptyState
              emoji="🐷"
              title="Nessun obiettivo ancora"
              subtitle="Crea il tuo primo obiettivo di risparmio: una vacanza, un acquisto, un fondo di emergenza."
            />
          </div>
        ) : (
          data.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              savedCents={data.savedByGoal.get(g.id) ?? 0}
              contributions={data.contributionsByGoal.get(g.id) ?? []}
              onEdit={() => setGoalSheet({ item: g })}
              onAddContribution={() => setContribGoal({ goal: g })}
            />
          ))
        )}

        <button
          type="button"
          className={`btn ${styles.addGoalBtn}`}
          onClick={() => setGoalSheet({ item: null })}
        >
          <IconPlus width={16} height={16} /> Nuovo obiettivo
        </button>
      </div>

      {goalSheet && <GoalFormSheet editing={goalSheet.item} onClose={() => setGoalSheet(null)} />}
      {contribGoal && (
        <ContributionSheet
          goal={contribGoal.goal}
          initialAmountCents={contribGoal.initial}
          onClose={() => setContribGoal(null)}
        />
      )}
    </div>
  )
}
