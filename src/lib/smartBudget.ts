/**
 * Pure math for the "smart budget with savings target" feature (v0.4.0).
 * No DB access, no React — the Budget screen's SmartBudgetSheet gathers
 * plain numbers from Dexie (income, fixed costs, per-category spending
 * averages) and feeds them in here; everything below is deterministic and
 * unit-testable in isolation.
 *
 * ROUNDING STRATEGY (read this before touching computeDistribution):
 * Budgets are integer euros, and the app's convention (see
 * lib/money.roundToNearest5) is that suggested amounts are multiples of 5.
 * Both `baselineEuros` and `proposedEuros` below must be multiples of 5,
 * and the hard invariant is: the household must never be told to spend
 * MORE than `available` once cuts are rounded. Rather than solving the cut
 * distribution with continuous numbers and rounding the answer afterwards
 * (which can round the wrong way and silently break that invariant), all
 * the cut math is done directly in 5-euro "chunks":
 *
 *   1. Each category's baseline is rounded to the nearest 5 up front.
 *   2. Each category's 30% cut cap is floored down to a whole number of
 *      chunks (`Math.floor`, never rounded up) — so even after chunking a
 *      category can never lose more than 30% of its baseline.
 *   3. The deficit to cover is converted to chunks by rounding UP
 *      (`Math.ceil`) — the waterfall always aims to cut at least enough,
 *      never less.
 *   4. Chunks are handed out proportionally to weight in a waterfall: each
 *      round, categories at their cap drop out and any leftover chunks
 *      (from per-category caps, or from `Math.floor`ing a fractional
 *      share) are redistributed over the remaining uncapped categories,
 *      largest fractional remainder first.
 *
 * Net effect: `sum(proposedEuros)` can end up a few euros *under*
 * `available` (rounding "down where needed" per category, as chunks),
 * never over — and essential/habit categories have zero weight, so they
 * are simply never part of the cuttable set and always stay at baseline.
 */

export type Flexibility = 'essential' | 'flexible' | 'veryFlexible'

const CHUNK_EUROS = 5
const MAX_CUT_FRACTION = 0.3

/** Existing categories predate the `flexibility` field; resolve the default
 * ('flexible') at read time instead of writing a migration. */
export function categoryFlexibility(flexibility: Flexibility | null | undefined): Flexibility {
  return flexibility ?? 'flexible'
}

function flexFactor(flexibility: Flexibility, habit: boolean): number {
  if (habit) return 0 // vice categories are never cut, whatever their flexibility
  switch (flexibility) {
    case 'essential':
      return 0
    case 'flexible':
      return 1
    case 'veryFlexible':
      return 2
  }
}

function roundToNearest5(euros: number): number {
  return Math.round(euros / 5) * 5
}

// ---------------------------------------------------------------------------
// Truth check
// ---------------------------------------------------------------------------

export interface TruthCheck {
  monthlyIncomeCents: number
  fixedCostsCents: number
  targetEuros: number
  targetCents: number
  /** income - fixed - target, exact cents */
  availableCents: number
  /** floor(availableCents/100) — the conservative integer-euro figure used
   * for every downstream comparison, so we never assume more headroom than
   * truly exists. */
  availableEuros: number
  /** floor((income-fixed)/100): the absolute ceiling on savings, i.e. what
   * you'd have left if you spent nothing at all beyond fixed costs. */
  maxTheoreticalSavingsEuros: number
  /** target > income - fixed: saving this much would require negative spending. */
  isAbsurd: boolean
  hasIncome: boolean
}

export function computeTruthCheck(
  monthlyIncomeCents: number,
  fixedCostsCents: number,
  targetEuros: number
): TruthCheck {
  const roundedTargetEuros = Math.round(targetEuros)
  const targetCents = roundedTargetEuros * 100
  const maxTheoreticalCents = monthlyIncomeCents - fixedCostsCents
  const availableCents = maxTheoreticalCents - targetCents
  return {
    monthlyIncomeCents,
    fixedCostsCents,
    targetEuros: roundedTargetEuros,
    targetCents,
    availableCents,
    availableEuros: Math.floor(availableCents / 100),
    maxTheoreticalSavingsEuros: Math.floor(maxTheoreticalCents / 100),
    isAbsurd: targetCents > maxTheoreticalCents,
    hasIncome: monthlyIncomeCents > 0,
  }
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

export interface SmartBudgetCategoryInput {
  categoryId: string
  flexibility: Flexibility
  habit: boolean
  /** Pre-rounding average variable spending (euros, possibly fractional).
   * 0 = no history; the category is skipped entirely (never proposed). */
  baselineRawEuros: number
}

export interface CategoryProposal {
  categoryId: string
  /** Rounded to the nearest 5; 0 if there was no spending history. */
  baselineEuros: number
  /** Rounded to a multiple of 5; equals baselineEuros for non-cuttable
   * categories (essential, habit, or no history). */
  proposedEuros: number
  cutEuros: number
  /** cutEuros / baselineEuros, 0 when baseline is 0. */
  cutFraction: number
  /** Whether this category was eligible to be cut at all (not essential,
   * not a habit, and has spending history). */
  cuttable: boolean
  /** Whether the cut hit the 30%-of-baseline cap. */
  capped: boolean
}

export type DistributionOutcome = 'noCutsNeeded' | 'cutsFullyCover' | 'cutsInsufficient'

export interface DistributionResult {
  outcome: DistributionOutcome
  proposals: CategoryProposal[]
  /** Sum of baselineEuros across categories with history. */
  baselineTotalEuros: number
  /** max(0, baselineTotal - available). */
  deficitEuros: number
  /** max(0, available - baselineTotal); only meaningful when outcome is 'noCutsNeeded'. */
  slackEuros: number
  /** The monthly savings this proposal actually achieves: targetEuros unless
   * outcome is 'cutsInsufficient', in which case it's the realistic max. */
  achievedMonthlySavingsEuros: number
}

/**
 * Distribute budget cuts across expense categories to make a savings target
 * fit, or report how close the household can realistically get. See the
 * module doc comment for the chunk-based rounding strategy.
 */
export function computeDistribution(
  categories: SmartBudgetCategoryInput[],
  availableEuros: number,
  targetEuros: number
): DistributionResult {
  const withBaseline = categories
    .filter((c) => c.baselineRawEuros > 0)
    .map((c) => ({ ...c, baselineEuros: Math.max(0, roundToNearest5(c.baselineRawEuros)) }))

  const baselineTotalEuros = withBaseline.reduce((sum, c) => sum + c.baselineEuros, 0)

  if (availableEuros >= baselineTotalEuros) {
    const proposals: CategoryProposal[] = withBaseline.map((c) => ({
      categoryId: c.categoryId,
      baselineEuros: c.baselineEuros,
      proposedEuros: c.baselineEuros,
      cutEuros: 0,
      cutFraction: 0,
      cuttable: false,
      capped: false,
    }))
    return {
      outcome: 'noCutsNeeded',
      proposals,
      baselineTotalEuros,
      deficitEuros: 0,
      slackEuros: availableEuros - baselineTotalEuros,
      achievedMonthlySavingsEuros: targetEuros,
    }
  }

  const deficitEuros = baselineTotalEuros - availableEuros
  const neededChunks = Math.ceil(deficitEuros / CHUNK_EUROS)

  interface Working {
    categoryId: string
    baselineEuros: number
    weight: number
    capChunks: number
    allocatedChunks: number
  }

  const working: Working[] = withBaseline.map((c) => {
    const weight = flexFactor(c.flexibility, c.habit) * c.baselineEuros
    const capEuros = Math.floor(c.baselineEuros * MAX_CUT_FRACTION)
    return {
      categoryId: c.categoryId,
      baselineEuros: c.baselineEuros,
      weight,
      capChunks: Math.floor(capEuros / CHUNK_EUROS),
      allocatedChunks: 0,
    }
  })

  let remaining = neededChunks
  let active = working.filter((w) => w.weight > 0 && w.capChunks > 0)
  let guard = 0
  const guardLimit = working.length + 5
  while (remaining > 0 && active.length > 0 && guard < guardLimit) {
    guard++
    const totalWeight = active.reduce((sum, w) => sum + w.weight, 0)
    if (totalWeight <= 0) break

    const shares = active.map((w) => ({ w, raw: (remaining * w.weight) / totalWeight }))
    let roundAssigned = 0
    for (const { w, raw } of shares) {
      const room = w.capChunks - w.allocatedChunks
      const chunk = Math.min(Math.floor(raw), room)
      w.allocatedChunks += chunk
      roundAssigned += chunk
    }

    let leftover = remaining - roundAssigned
    if (leftover > 0) {
      const withRoom = shares
        .filter(({ w }) => w.allocatedChunks < w.capChunks)
        .sort((a, b) => b.raw - Math.floor(b.raw) - (a.raw - Math.floor(a.raw)))
      for (const { w } of withRoom) {
        if (leftover <= 0) break
        w.allocatedChunks++
        leftover--
        roundAssigned++
      }
    }

    remaining -= roundAssigned
    active = active.filter((w) => w.allocatedChunks < w.capChunks)
    if (roundAssigned === 0) break // no progress possible, avoid spinning
  }

  const proposals: CategoryProposal[] = working.map((w) => {
    const cutEuros = w.allocatedChunks * CHUNK_EUROS
    // baselineEuros - cutEuros is >=0 and a multiple of 5 by construction
    // (capChunks*5 <= 30% of baseline < baseline), so the max(5, ...) below
    // is a defensive floor, not something that should ever actually fire
    // for a category with baselineEuros > 0.
    const proposedEuros = w.baselineEuros > 0 ? Math.max(CHUNK_EUROS, w.baselineEuros - cutEuros) : 0
    const appliedCut = w.baselineEuros - proposedEuros
    return {
      categoryId: w.categoryId,
      baselineEuros: w.baselineEuros,
      proposedEuros,
      cutEuros: appliedCut,
      cutFraction: w.baselineEuros > 0 ? appliedCut / w.baselineEuros : 0,
      cuttable: w.weight > 0 && w.capChunks > 0,
      capped: w.capChunks > 0 && w.allocatedChunks >= w.capChunks,
    }
  })

  const totalCutEuros = proposals.reduce((sum, p) => sum + p.cutEuros, 0)
  const shortfall = Math.max(0, deficitEuros - totalCutEuros)
  const fullyCovered = shortfall <= 0

  return {
    outcome: fullyCovered ? 'cutsFullyCover' : 'cutsInsufficient',
    proposals,
    baselineTotalEuros,
    deficitEuros,
    slackEuros: 0,
    achievedMonthlySavingsEuros: fullyCovered ? targetEuros : Math.max(0, targetEuros - shortfall),
  }
}
