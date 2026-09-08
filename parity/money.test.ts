import { parityModule } from './harness'
import {
  formatCents,
  formatCentsCompact,
  formatEuros,
  roundToNearest5,
  roundUpToNearest5,
  parseAmountToCents,
  centsToEuros,
  eurosToCents,
} from '../src/lib/money'
import { setActiveLanguage } from '../src/lib/locale'
import type { Language } from '../src/db/types'

interface LangCents {
  lang: Language
  cents: number
}

interface LangEuros {
  lang: Language
  euros: number
}

function withLang<T extends { lang: Language }, R>(impl: (input: T) => R): (input: T) => R {
  return (input: T) => {
    setActiveLanguage(input.lang)
    return impl(input)
  }
}

const formatCentsCases: { name: string; input: LangCents }[] = []
const formatCentsCompactCases: { name: string; input: LangCents }[] = []
const formatEurosCases: { name: string; input: LangEuros }[] = []

for (const lang of ['en', 'it'] as const) {
  for (const cents of [0, 1, 99, 100, 150, 123456, 100000000, -150, -123456, 1000, 99999]) {
    formatCentsCases.push({ name: `${cents} cents, ${lang}`, input: { lang, cents } })
  }
  for (const cents of [0, 100, 150, 123400, 123456, -100, -150, 5]) {
    formatCentsCompactCases.push({ name: `${cents} cents, ${lang}`, input: { lang, cents } })
  }
  for (const euros of [0, 150, 1234, 1000000, -150]) {
    formatEurosCases.push({ name: `${euros} euros, ${lang}`, input: { lang, euros } })
  }
}

parityModule('money', {
  formatCents: {
    cases: formatCentsCases,
    impl: withLang<LangCents, string>((input) => formatCents(input.cents)),
  },
  formatCentsCompact: {
    cases: formatCentsCompactCases,
    impl: withLang<LangCents, string>((input) => formatCentsCompact(input.cents)),
  },
  formatEuros: {
    cases: formatEurosCases,
    impl: withLang<LangEuros, string>((input) => formatEuros(input.euros)),
  },
  // Normalize -0 to 0 in both round* impls below: e.g. roundToNearest5(-2.5)
  // is mathematically -0 (Math.round(-0.5) * 5), a JS floating-point
  // artifact that vitest's toEqual treats as distinct from 0 (unlike `===`
  // or JSON, which both consider them equal — JSON.stringify(-0) is "0").
  // Swift's `Int` has no negative zero, so Money.roundToNearest5 already
  // produces plain 0 here; normalizing the oracle avoids a spurious
  // self-comparison failure that has nothing to do with the port.
  roundToNearest5: {
    cases: [
      0, 2.4, 2.5, 7.5, 12.5, 13, 17.4, 17.5, 22.5, 100, 102.49, 102.5, -2.5, -7.5, -12.5, 0.1,
      1234.567, 3.75,
    ].map((euros) => ({ name: `${euros}`, input: { euros } })),
    impl: (input: { euros: number }) => roundToNearest5(input.euros) || 0,
  },
  roundUpToNearest5: {
    cases: [0, 0.01, 4.99, 5, 5.01, 12.5, 100, -0.5, -7.5, 33.33].map((euros) => ({
      name: `${euros}`,
      input: { euros },
    })),
    impl: (input: { euros: number }) => roundUpToNearest5(input.euros) || 0,
  },
  parseAmountToCents: {
    cases: [
      '',
      '0',
      '12',
      '12,50',
      '12.50',
      '1250',
      '1,5',
      '1.5',
      '0,05',
      '0.005',
      '1.005',
      '2.675',
      '.5',
      ',5',
      '5.',
      'abc',
      '12abc',
      '1,234,5',
      '1.2.3',
      '  7',
      '-3,10',
      '+4',
      '1e2',
      '99999999',
      '0.1',
      '0.7',
      '1.1',
    ].map((input) => ({ name: JSON.stringify(input), input: { input } })),
    impl: (input: { input: string }) => parseAmountToCents(input.input),
  },
  centsToEuros: {
    cases: [0, 150, -150, 123456, 1].map((cents) => ({ name: `${cents}`, input: { cents } })),
    impl: (input: { cents: number }) => centsToEuros(input.cents),
  },
  eurosToCents: {
    cases: [0, 1.5, 0.1, 0.7, 1.1, 2.675, 1.005, -1.5, 1234.567, 0.015, 0.025].map((euros) => ({
      name: `${euros}`,
      input: { euros },
    })),
    impl: (input: { euros: number }) => eurosToCents(input.euros),
  },
})
