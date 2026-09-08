import { parityModule } from './harness'
import {
  addMonths,
  daysInMonth,
  dayLabel,
  dayMonthLabel,
  firstOfMonth,
  lastNMonths,
  monthDiff,
  monthLabel,
  monthLabelShort,
  monthsBetweenInclusive,
  parseISODate,
  parseMonthKey,
  toISODate,
  toMonthKey,
} from '../src/lib/dates'
import { setActiveLanguage } from '../src/lib/locale'
import type { Language } from '../src/db/types'

const MONTHS_2026 = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)
const LANGS: Language[] = ['en', 'it']

interface LangMonthKeyInput {
  monthKey: string
  lang: Language
}

interface LangIsoInput {
  iso: string
  lang: Language
}

interface YmdInput {
  year: number
  month: number
  day: number
}

interface MonthKeyInput {
  monthKey: string
}

interface IsoInput {
  iso: string
}

interface AddMonthsInput {
  monthKey: string
  delta: number
}

interface LastNMonthsInput {
  monthKey: string
  n: number
}

interface MonthDiffInput {
  a: string
  b: string
}

interface MonthsBetweenInput {
  from: string
  to: string
}

parityModule('dates', {
  monthLabel: {
    cases: [
      ...LANGS.flatMap((lang) => MONTHS_2026.map((monthKey) => ({ name: `${lang}: ${monthKey}`, input: { monthKey, lang } }))),
      { name: 'en: 2024-02', input: { monthKey: '2024-02', lang: 'en' } },
      { name: 'en: 1999-12', input: { monthKey: '1999-12', lang: 'en' } },
    ] as { name: string; input: LangMonthKeyInput }[],
    impl: (input: LangMonthKeyInput) => {
      setActiveLanguage(input.lang)
      return monthLabel(input.monthKey)
    },
  },
  monthLabelShort: {
    cases: [
      ...LANGS.flatMap((lang) => MONTHS_2026.map((monthKey) => ({ name: `${lang}: ${monthKey}`, input: { monthKey, lang } }))),
      { name: 'en: 2024-02', input: { monthKey: '2024-02', lang: 'en' } },
      { name: 'en: 1999-12', input: { monthKey: '1999-12', lang: 'en' } },
    ] as { name: string; input: LangMonthKeyInput }[],
    impl: (input: LangMonthKeyInput) => {
      setActiveLanguage(input.lang)
      return monthLabelShort(input.monthKey)
    },
  },
  dayLabel: {
    cases: [
      ...LANGS.flatMap((lang) =>
        [
          '2026-09-07',
          '2026-09-08',
          '2026-09-09',
          '2026-09-10',
          '2026-09-11',
          '2026-09-12',
          '2026-09-13',
          '2026-01-01',
          '2026-12-31',
          '2024-02-29',
        ].map((iso) => ({ name: `${lang}: ${iso}`, input: { iso, lang } }))
      ),
    ] as { name: string; input: LangIsoInput }[],
    impl: (input: LangIsoInput) => {
      setActiveLanguage(input.lang)
      return dayLabel(input.iso)
    },
  },
  dayMonthLabel: {
    cases: [
      ...LANGS.flatMap((lang) =>
        [
          '2026-09-07',
          '2026-09-08',
          '2026-09-09',
          '2026-09-10',
          '2026-09-11',
          '2026-09-12',
          '2026-09-13',
          '2026-01-01',
          '2026-12-31',
          '2024-02-29',
        ].map((iso) => ({ name: `${lang}: ${iso}`, input: { iso, lang } }))
      ),
    ] as { name: string; input: LangIsoInput }[],
    impl: (input: LangIsoInput) => {
      setActiveLanguage(input.lang)
      return dayMonthLabel(input.iso)
    },
  },
  toMonthKey: {
    cases: [
      { name: '2026-09-08', input: { year: 2026, month: 9, day: 8 } },
      { name: '2026-01-01', input: { year: 2026, month: 1, day: 1 } },
      { name: '2026-12-31', input: { year: 2026, month: 12, day: 31 } },
      { name: '2024-02-29', input: { year: 2024, month: 2, day: 29 } },
      { name: '2000-01-01', input: { year: 2000, month: 1, day: 1 } },
    ] as { name: string; input: YmdInput }[],
    impl: (input: YmdInput) => toMonthKey(new Date(input.year, input.month - 1, input.day)),
  },
  toISODate: {
    cases: [
      { name: '2026-09-08', input: { year: 2026, month: 9, day: 8 } },
      { name: '2026-01-01', input: { year: 2026, month: 1, day: 1 } },
      { name: '2026-12-31', input: { year: 2026, month: 12, day: 31 } },
      { name: '2024-02-29', input: { year: 2024, month: 2, day: 29 } },
      { name: '2000-01-01', input: { year: 2000, month: 1, day: 1 } },
    ] as { name: string; input: YmdInput }[],
    impl: (input: YmdInput) => toISODate(new Date(input.year, input.month - 1, input.day)),
  },
  parseISODate: {
    cases: [
      { name: '2026-09-08', input: { iso: '2026-09-08' } },
      { name: '2024-02-29', input: { iso: '2024-02-29' } },
      { name: '2026-12-31', input: { iso: '2026-12-31' } },
    ] as { name: string; input: IsoInput }[],
    impl: (input: IsoInput) => {
      const d = parseISODate(input.iso)
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
    },
  },
  parseMonthKey: {
    cases: [
      { name: '2026-09', input: { monthKey: '2026-09' } },
      { name: '2024-02', input: { monthKey: '2024-02' } },
      { name: '0999-01', input: { monthKey: '0999-01' } },
    ] as { name: string; input: MonthKeyInput }[],
    impl: (input: MonthKeyInput) => parseMonthKey(input.monthKey),
  },
  addMonths: {
    cases: [
      { name: '2026-09 + 0', input: { monthKey: '2026-09', delta: 0 } },
      { name: '2026-09 + 1', input: { monthKey: '2026-09', delta: 1 } },
      { name: '2026-09 + 4', input: { monthKey: '2026-09', delta: 4 } },
      { name: '2026-12 + 1', input: { monthKey: '2026-12', delta: 1 } },
      { name: '2026-01 - 1', input: { monthKey: '2026-01', delta: -1 } },
      { name: '2026-01 - 13', input: { monthKey: '2026-01', delta: -13 } },
      { name: '2026-06 + 30', input: { monthKey: '2026-06', delta: 30 } },
      { name: '2026-06 - 30', input: { monthKey: '2026-06', delta: -30 } },
      { name: '2024-02 + 12', input: { monthKey: '2024-02', delta: 12 } },
    ] as { name: string; input: AddMonthsInput }[],
    impl: (input: AddMonthsInput) => addMonths(input.monthKey, input.delta),
  },
  firstOfMonth: {
    cases: [
      { name: '2026-09', input: { monthKey: '2026-09' } },
      { name: '2024-02', input: { monthKey: '2024-02' } },
    ] as { name: string; input: MonthKeyInput }[],
    impl: (input: MonthKeyInput) => firstOfMonth(input.monthKey),
  },
  daysInMonth: {
    cases: [
      ...MONTHS_2026.map((monthKey) => ({ name: monthKey, input: { monthKey } })),
      { name: '2024-02', input: { monthKey: '2024-02' } },
      { name: '2000-02', input: { monthKey: '2000-02' } },
      { name: '1900-02', input: { monthKey: '1900-02' } },
      { name: '2100-02', input: { monthKey: '2100-02' } },
      { name: '2023-02', input: { monthKey: '2023-02' } },
    ] as { name: string; input: MonthKeyInput }[],
    impl: (input: MonthKeyInput) => daysInMonth(input.monthKey),
  },
  lastNMonths: {
    cases: [
      { name: '2026-09, 3', input: { monthKey: '2026-09', n: 3 } },
      { name: '2026-09, 1', input: { monthKey: '2026-09', n: 1 } },
      { name: '2026-09, 0', input: { monthKey: '2026-09', n: 0 } },
      { name: '2026-02, 12', input: { monthKey: '2026-02', n: 12 } },
      { name: '2026-01, 2', input: { monthKey: '2026-01', n: 2 } },
    ] as { name: string; input: LastNMonthsInput }[],
    impl: (input: LastNMonthsInput) => lastNMonths(input.monthKey, input.n),
  },
  monthDiff: {
    cases: [
      { name: '2026-01 -> 2026-09', input: { a: '2026-01', b: '2026-09' } },
      { name: '2026-09 -> 2026-01', input: { a: '2026-09', b: '2026-01' } },
      { name: '2025-12 -> 2026-01', input: { a: '2025-12', b: '2026-01' } },
      { name: '2026-03 -> 2026-03', input: { a: '2026-03', b: '2026-03' } },
      { name: '2020-06 -> 2026-06', input: { a: '2020-06', b: '2026-06' } },
    ] as { name: string; input: MonthDiffInput }[],
    impl: (input: MonthDiffInput) => monthDiff(input.a, input.b),
  },
  monthsBetweenInclusive: {
    cases: [
      { name: '2026-01 -> 2026-03', input: { from: '2026-01', to: '2026-03' } },
      { name: '2026-11 -> 2027-02', input: { from: '2026-11', to: '2027-02' } },
      { name: '2026-05 -> 2026-05', input: { from: '2026-05', to: '2026-05' } },
      { name: '2026-06 -> 2026-05 (empty)', input: { from: '2026-06', to: '2026-05' } },
      { name: '2025-12 -> 2026-12', input: { from: '2025-12', to: '2026-12' } },
    ] as { name: string; input: MonthsBetweenInput }[],
    impl: (input: MonthsBetweenInput) => monthsBetweenInclusive(input.from, input.to),
  },
})
