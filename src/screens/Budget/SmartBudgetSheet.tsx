import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { db } from '../../db/db'
import {
  activeRecurringMonthlyTotals,
  averageMonthlyIncomeCents,
  categoryMonthlyAverageCents,
  variableSpendingAverages,
  goalSavedCents,
} from '../../lib/stats'
import {
  categoryFlexibility,
  computeTruthCheck,
  computeDistribution,
  type DistributionResult,
  type TruthCheck,
  type SmartBudgetCategoryInput,
} from '../../lib/smartBudget'
import { setSavingsPlan } from '../../lib/savingsPlan'
import { upsertBudget } from '../../lib/budgets'
import { monthDiff } from '../../lib/dates'
import { currentPeriodKey } from '../../lib/period'
import { formatEuros, formatCents, roundUpToNearest5 } from '../../lib/money'
import { useT } from '../../i18n'
import type { Category, Goal } from '../../db/types'

interface Props {
  month: string
  categories: Category[]
  onClose: () => void
  onApplied: () => void
}

type Step = 'target' | 'noIncome' | 'absurd' | 'noHistory' | 'preview'

export function SmartBudgetSheet({ month, categories, onClose, onApplied }: Props) {
  const t = useT()
  const [step, setStep] = useState<Step>('target')
  const [targetInput, setTargetInput] = useState('')
  const [goalId, setGoalId] = useState<string>('')
  const [motivation, setMotivation] = useState('')
  const [truthCheck, setTruthCheck] = useState<TruthCheck | null>(null)
  const [distribution, setDistribution] = useState<DistributionResult | null>(null)
  const [editedProposals, setEditedProposals] = useState<Map<string, number>>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryIds = categories.map((c) => c.id)
  const habitCategoryIds = categories.filter((c) => c.habit).map((c) => c.id)
  const categoriesKey = categoryIds.join('|') + '::' + habitCategoryIds.join('|')

  const data = useLiveQuery(async () => {
    const goalsAll = await db.goals.toArray()
    const goals = goalsAll.filter((g) => !g.archived).sort((a, b) => a.sortOrder - b.sortOrder)
    const savedByGoal = new Map<string, number>()
    for (const g of goals) {
      savedByGoal.set(g.id, await goalSavedCents(g.id))
    }
    const [recurringTotals, avgIncomeFallback, variableAvg] = await Promise.all([
      activeRecurringMonthlyTotals(),
      averageMonthlyIncomeCents(month),
      variableSpendingAverages(month, categoryIds),
    ])
    const habitAverages = new Map<string, number>()
    for (const catId of habitCategoryIds) {
      habitAverages.set(catId, await categoryMonthlyAverageCents(catId, month, true))
    }
    const monthlyIncomeCents = recurringTotals.incomeCents > 0 ? recurringTotals.incomeCents : avgIncomeFallback
    return {
      goals,
      savedByGoal,
      monthlyIncomeCents,
      fixedCostsCents: recurringTotals.expenseCents,
      variableAvg,
      habitAverages,
    }
    // `categories` (and derived categoryIds/habitCategoryIds) are captured via
    // closure; `categoriesKey` below is a stable string so this only reruns
    // when the actual set of categories or their habit flag changes.
  }, [month, categoriesKey])

  function handleTargetChange(raw: string) {
    setTargetInput(raw.replace(/[^0-9]/g, '').slice(0, 6))
  }

  function handleSelectGoal(id: string) {
    setGoalId(id)
    if (!id || !data) return
    setMotivation('')
    const goal = data.goals.find((g) => g.id === id)
    if (goal?.deadline) {
      const saved = data.savedByGoal.get(id) ?? 0
      const remainingCents = Math.max(0, goal.targetCents - saved)
      const monthsLeft = Math.max(1, monthDiff(currentPeriodKey(), goal.deadline))
      const paceEuros = roundUpToNearest5(remainingCents / 100 / monthsLeft)
      if (paceEuros > 0) setTargetInput(String(paceEuros))
    }
  }

  function handleMotivationChange(text: string) {
    setMotivation(text)
    if (text.trim().length > 0) setGoalId('')
  }

  async function handleContinue() {
    const targetEuros = Number.parseInt(targetInput, 10) || 0
    if (targetEuros <= 0 || !data) return

    try {
      await setSavingsPlan({
        amountEuros: targetEuros,
        goalId: goalId || undefined,
        motivation: motivation.trim() || undefined,
      })
    } catch {
      // Non-fatal: the plan is a convenience record, still let the user
      // continue building a budget proposal even if persisting it failed.
    }

    if (data.monthlyIncomeCents <= 0) {
      setStep('noIncome')
      return
    }

    const tc = computeTruthCheck(data.monthlyIncomeCents, data.fixedCostsCents, targetEuros)
    setTruthCheck(tc)

    if (tc.isAbsurd) {
      setStep('absurd')
      return
    }

    const catInputs: SmartBudgetCategoryInput[] = categories.map((c) => ({
      categoryId: c.id,
      flexibility: categoryFlexibility(c.flexibility),
      habit: !!c.habit,
      baselineRawEuros: (data.variableAvg.averagesCents.get(c.id) ?? 0) / 100,
    }))

    if (catInputs.every((c) => c.baselineRawEuros <= 0)) {
      setStep('noHistory')
      return
    }

    const dist = computeDistribution(catInputs, tc.availableEuros, targetEuros)
    setDistribution(dist)
    setEditedProposals(new Map(dist.proposals.map((p) => [p.categoryId, p.proposedEuros])))
    setStep('preview')
  }

  function handleBackToTarget() {
    setStep('target')
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      for (const [catId, euros] of editedProposals.entries()) {
        await upsertBudget(month, catId, euros)
      }
      onApplied()
    } catch {
      setError(t.common.saveFailed)
      setSaving(false)
    }
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <Sheet title={t.smartBudget.title} onClose={onClose}>
      {!data ? (
        <p className="secondary-text" style={{ fontSize: 13 }}>
          {t.common.loading}
        </p>
      ) : step === 'target' ? (
        <div className="stack">
          <p className="secondary-text" style={{ fontSize: 14, fontWeight: 600 }}>
            {t.smartBudget.targetQuestion}
          </p>
          <div className="field">
            <label htmlFor="sb-target">{t.smartBudget.targetInputLabel}</label>
            <input
              id="sb-target"
              className="input"
              type="text"
              inputMode="numeric"
              value={targetInput}
              placeholder="0"
              onChange={(e) => handleTargetChange(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="sb-goal">{t.smartBudget.linkGoalLabel}</label>
            <select id="sb-goal" className="select" value={goalId} onChange={(e) => handleSelectGoal(e.target.value)}>
              <option value="">{t.smartBudget.linkGoalNone}</option>
              {data.goals.map((g: Goal) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sb-motivation">{t.smartBudget.motivationLabel}</label>
            <input
              id="sb-motivation"
              className="input"
              type="text"
              value={motivation}
              onChange={(e) => handleMotivationChange(e.target.value)}
              placeholder={t.smartBudget.motivationPlaceholder}
              maxLength={80}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!targetInput || Number.parseInt(targetInput, 10) <= 0}
            onClick={handleContinue}
          >
            {t.smartBudget.continue}
          </button>
        </div>
      ) : step === 'noIncome' ? (
        <div className="stack">
          <p style={{ fontWeight: 700, fontSize: 15 }}>{t.smartBudget.noIncomeTitle}</p>
          <p className="secondary-text" style={{ fontSize: 13.5 }}>
            {t.smartBudget.noIncomeBody}
          </p>
          <button type="button" className="btn btn-block" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
      ) : step === 'absurd' && truthCheck ? (
        <div className="stack">
          <p style={{ fontWeight: 700, fontSize: 15 }}>{t.smartBudget.absurdTitle}</p>
          <p className="secondary-text" style={{ fontSize: 13.5 }}>
            {t.smartBudget.absurdMessage(
              formatEuros(truthCheck.targetEuros),
              formatEuros(Math.max(0, truthCheck.maxTheoreticalSavingsEuros))
            )}
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={handleBackToTarget}>
            {t.smartBudget.adjustTarget}
          </button>
        </div>
      ) : step === 'noHistory' ? (
        <div className="stack">
          <p style={{ fontWeight: 700, fontSize: 15 }}>{t.smartBudget.noHistoryTitle}</p>
          <p className="secondary-text" style={{ fontSize: 13.5 }}>
            {t.smartBudget.noHistoryBody}
          </p>
          <button type="button" className="btn btn-block" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
      ) : step === 'preview' && distribution && truthCheck ? (
        <div className="stack">
          <div
            className="card"
            style={{
              background:
                distribution.outcome === 'cutsInsufficient'
                  ? 'color-mix(in srgb, var(--status-warning-bg) 16%, transparent)'
                  : 'color-mix(in srgb, var(--status-good) 12%, transparent)',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
              {distribution.outcome === 'noCutsNeeded'
                ? t.smartBudget.noCutsNeededBanner(formatEuros(distribution.slackEuros))
                : distribution.outcome === 'cutsFullyCover'
                  ? t.smartBudget.cutsAppliedBanner(formatEuros(truthCheck.targetEuros))
                  : t.smartBudget.insufficientBanner(
                      formatEuros(distribution.achievedMonthlySavingsEuros),
                      formatEuros(truthCheck.targetEuros)
                    )}
            </p>
          </div>

          {habitCategoryIds.map((catId) => {
            const cat = categoryById.get(catId)
            const monthlyCents = data.habitAverages.get(catId) ?? 0
            if (!cat || monthlyCents <= 0) return null
            return (
              <div key={catId} className="card" style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 12.5, margin: 0 }}>
                  {t.smartBudget.habitInsight(cat.name, formatCents(monthlyCents), formatCents(monthlyCents * 12))}
                </p>
              </div>
            )
          })}

          <div className="stack" style={{ gap: 6 }}>
            {distribution.proposals
              .slice()
              .sort((a, b) => (categoryById.get(a.categoryId)?.sortOrder ?? 0) - (categoryById.get(b.categoryId)?.sortOrder ?? 0))
              .map((p) => {
                const cat = categoryById.get(p.categoryId)
                if (!cat) return null
                return (
                  <ProposalRow
                    key={p.categoryId}
                    category={cat}
                    baselineEuros={p.baselineEuros}
                    initialProposedEuros={editedProposals.get(p.categoryId) ?? p.proposedEuros}
                    onChange={(euros) =>
                      setEditedProposals((prev) => new Map(prev).set(p.categoryId, euros))
                    }
                  />
                )
              })}
          </div>

          {error && (
            <div style={{ color: 'var(--status-critical)', fontSize: 12, textAlign: 'center' }}>{error}</div>
          )}

          {distribution.outcome === 'cutsInsufficient' ? (
            <div className="stack" style={{ gap: 8 }}>
              <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={handleConfirm}>
                {t.smartBudget.proceedWithMax}
              </button>
              <button type="button" className="btn btn-block" onClick={handleBackToTarget}>
                {t.smartBudget.lowerTarget}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={handleConfirm}>
              {t.smartBudget.confirm}
            </button>
          )}
        </div>
      ) : null}
    </Sheet>
  )
}

interface ProposalRowProps {
  category: Category
  baselineEuros: number
  initialProposedEuros: number
  onChange: (euros: number) => void
}

const MAX_BUDGET_EUROS = 999999

function ProposalRow({ category, baselineEuros, initialProposedEuros, onChange }: ProposalRowProps) {
  const t = useT()
  const [value, setValue] = useState(String(initialProposedEuros))
  const euros = Number.parseInt(value, 10) || 0
  const cutEuros = baselineEuros - euros

  function commit() {
    const parsed = Math.min(MAX_BUDGET_EUROS, Math.max(0, Number.parseInt(value, 10) || 0))
    setValue(String(parsed))
    onChange(parsed)
  }

  return (
    <div className="card" style={{ padding: '8px 10px' }}>
      <div className="row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 13 }}>
            {category.emoji} {category.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onBlur={commit}
            aria-label={t.smartBudget.categoryBudgetAriaLabel(category.name)}
            style={{
              width: 52,
              minHeight: 28,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              textAlign: 'right',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '0 6px',
            }}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            €
          </span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 3 }}>
        <span className="muted" style={{ fontSize: 10.5 }}>
          {t.smartBudget.baselineLabel} {formatEuros(baselineEuros)}
        </span>
        {cutEuros !== 0 ? (
          <span
            className={`pill ${cutEuros > 0 ? 'pill-warning' : 'pill-good'}`}
            style={{ padding: '2px 8px', fontSize: 10.5 }}
          >
            {cutEuros > 0 ? `−${formatEuros(cutEuros)}` : `+${formatEuros(-cutEuros)}`}
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 10.5 }}>
            {formatEuros(0)}
          </span>
        )}
      </div>
    </div>
  )
}
