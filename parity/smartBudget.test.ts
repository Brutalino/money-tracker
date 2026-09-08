import { parityModule } from './harness'
import {
  computeTruthCheck,
  computeDistribution,
  type Flexibility,
  type SmartBudgetCategoryInput,
} from '../src/lib/smartBudget'

interface TruthCheckInput {
  monthlyIncomeCents: number
  fixedCostsCents: number
  targetEuros: number
}

interface DistributionInput {
  categories: SmartBudgetCategoryInput[]
  availableEuros: number
  targetEuros: number
}

function cat(
  categoryId: string,
  flexibility: Flexibility,
  habit: boolean,
  baselineRawEuros: number
): SmartBudgetCategoryInput {
  return { categoryId, flexibility, habit, baselineRawEuros }
}

await parityModule('smartBudget', {
  computeTruthCheck: {
    cases: [
      { name: 'comfortable target', input: { monthlyIncomeCents: 250000, fixedCostsCents: 80000, targetEuros: 500 } },
      { name: 'target equals max theoretical', input: { monthlyIncomeCents: 250000, fixedCostsCents: 80000, targetEuros: 1700 } },
      { name: 'target rounds up past max (absurd)', input: { monthlyIncomeCents: 250000, fixedCostsCents: 80000, targetEuros: 1700.4 } },
      { name: 'target rounds down under max', input: { monthlyIncomeCents: 250000, fixedCostsCents: 80000, targetEuros: 1699.6 } },
      { name: 'no income, no fixed costs, positive target', input: { monthlyIncomeCents: 0, fixedCostsCents: 0, targetEuros: 100 } },
      { name: 'fixed costs exceed income, zero target', input: { monthlyIncomeCents: 100000, fixedCostsCents: 120000, targetEuros: 0 } },
      { name: 'arbitrary figures', input: { monthlyIncomeCents: 123456, fixedCostsCents: 65432, targetEuros: 300 } },
      { name: 'zero target with headroom', input: { monthlyIncomeCents: 250000, fixedCostsCents: 80000, targetEuros: 0 } },
    ] as { name: string; input: TruthCheckInput }[],
    impl: (input: TruthCheckInput) =>
      computeTruthCheck(input.monthlyIncomeCents, input.fixedCostsCents, input.targetEuros),
  },
  computeDistribution: {
    cases: [
      {
        name: 'no cuts needed: slack available',
        input: {
          categories: [cat('groceries', 'flexible', false, 200), cat('fun', 'veryFlexible', false, 100)],
          availableEuros: 400,
          targetEuros: 100,
        },
      },
      {
        name: 'all essential: cuts insufficient with zero cuts',
        input: {
          categories: [cat('rent', 'essential', false, 800), cat('insurance', 'essential', false, 100)],
          availableEuros: 500,
          targetEuros: 400,
        },
      },
      {
        name: 'mix of flexible/veryFlexible cuts fully cover',
        input: {
          categories: [
            cat('groceries', 'flexible', false, 300),
            cat('entertainment', 'veryFlexible', false, 150),
            cat('rent', 'essential', false, 800),
          ],
          availableEuros: 1200,
          targetEuros: 200,
        },
      },
      {
        name: 'habit category never cut even when veryFlexible',
        input: {
          categories: [
            cat('smoking', 'veryFlexible', true, 100),
            cat('fun', 'veryFlexible', false, 100),
          ],
          availableEuros: 100,
          targetEuros: 50,
        },
      },
      {
        name: 'baselines with .5 ties round to nearest 5',
        input: {
          categories: [
            cat('a', 'flexible', false, 12.5),
            cat('b', 'flexible', false, 17.5),
            cat('c', 'flexible', false, 22.5),
          ],
          availableEuros: 20,
          targetEuros: 30,
        },
      },
      {
        name: 'tiny baselines round to 0 or 5, zero filtered out',
        input: {
          categories: [
            cat('tiny1', 'flexible', false, 2),
            cat('tiny2', 'flexible', false, 4.9),
            cat('none', 'flexible', false, 0),
          ],
          availableEuros: 0,
          targetEuros: 10,
        },
      },
      {
        name: 'deficit not divisible by 5',
        input: {
          categories: [cat('groceries', 'flexible', false, 300), cat('fun', 'veryFlexible', false, 200)],
          availableEuros: 487,
          targetEuros: 100,
        },
      },
      {
        name: 'categories hitting the 30% cap',
        input: {
          categories: [
            cat('small', 'veryFlexible', false, 20),
            cat('big', 'veryFlexible', false, 500),
          ],
          availableEuros: 100,
          targetEuros: 300,
        },
      },
      {
        name: 'leftover-chunk distribution with equal fractional remainders (stable sort)',
        input: {
          categories: [
            cat('a', 'flexible', false, 100),
            cat('b', 'flexible', false, 100),
            cat('c', 'flexible', false, 100),
          ],
          availableEuros: 295,
          targetEuros: 15,
        },
      },
      {
        name: 'single category',
        input: {
          categories: [cat('solo', 'flexible', false, 200)],
          availableEuros: 150,
          targetEuros: 50,
        },
      },
      {
        name: 'empty category list',
        input: {
          categories: [],
          availableEuros: 100,
          targetEuros: 50,
        },
      },
      {
        name: 'negative availableEuros',
        input: {
          categories: [cat('groceries', 'flexible', false, 200), cat('fun', 'veryFlexible', false, 100)],
          availableEuros: -50,
          targetEuros: 300,
        },
      },
    ] as { name: string; input: DistributionInput }[],
    impl: (input: DistributionInput) =>
      computeDistribution(input.categories, input.availableEuros, input.targetEuros),
  },
})
