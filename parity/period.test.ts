import { parityModule } from './harness'
import {
  periodEndISO,
  periodKeyForDate,
  periodLabel,
  periodLabelCompact,
  periodLabelShort,
  periodStartISO,
  setActivePeriodStartDay,
} from '../src/lib/period'
import { parseISODate } from '../src/lib/dates'
import { setActiveLanguage } from '../src/lib/locale'
import type { Language } from '../src/db/types'

const LANGS: Language[] = ['en', 'it']

interface StartDayKeyInput {
  startDay: number
  key: string
}

interface StartDayIsoInput {
  startDay: number
  iso: string
}

interface ElapsedFractionInput {
  startDay: number
  periodKey: string
  today: string
}

interface LabelInput {
  startDay: number
  key: string
  lang: Language
}

interface ValidStartDayInput {
  value: unknown
}

/**
 * periodElapsedFraction reads the real clock (currentPeriodKey() ->
 * todayISO()), so it can't be called directly in a parity test with a fixed
 * "today". Instead this composes the same exported pieces period.ts itself
 * uses (periodKeyForDate, periodStartISO, periodEndISO, parseISODate) with
 * `today` taken from the input, mirroring periodElapsedFraction's body
 * exactly (see src/lib/period.ts).
 */
function computeElapsedFraction(input: ElapsedFractionInput): number {
  setActivePeriodStartDay(input.startDay)
  const nowKey = periodKeyForDate(input.today)
  if (input.periodKey < nowKey) return 1
  if (input.periodKey > nowKey) return 0
  const start = parseISODate(periodStartISO(input.periodKey))
  const end = parseISODate(periodEndISO(input.periodKey))
  const today = parseISODate(input.today)
  const daysSince = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)
  const elapsed = daysSince(start, today) + 1
  const total = daysSince(start, end) + 1
  return Math.min(1, elapsed / total)
}

/** Replicates getStoredPeriodStartDay's validation predicate on a raw value, without the async DB read. */
function computeValidStartDay(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31 ? value : 1
}

const LABEL_KEYS = ['2026-07', '2026-12', '2026-02']

await parityModule('period', {
  periodStartISO: {
    cases: [1, 15, 26, 31].flatMap((startDay) =>
      ['2026-01', '2026-02', '2024-02', '2026-04', '2026-12'].map((key) => ({
        name: `startDay ${startDay}, ${key}`,
        input: { startDay, key },
      }))
    ) as { name: string; input: StartDayKeyInput }[],
    impl: (input: StartDayKeyInput) => {
      setActivePeriodStartDay(input.startDay)
      return periodStartISO(input.key)
    },
  },
  periodEndISO: {
    cases: [1, 15, 26, 31].flatMap((startDay) =>
      ['2026-01', '2026-02', '2024-02', '2026-04', '2026-12'].map((key) => ({
        name: `startDay ${startDay}, ${key}`,
        input: { startDay, key },
      }))
    ) as { name: string; input: StartDayKeyInput }[],
    impl: (input: StartDayKeyInput) => {
      setActivePeriodStartDay(input.startDay)
      return periodEndISO(input.key)
    },
  },
  periodKeyForDate: {
    cases: [
      { name: 'startDay 1, 2026-09-08', input: { startDay: 1, iso: '2026-09-08' } },
      { name: 'startDay 26, 2026-09-25', input: { startDay: 26, iso: '2026-09-25' } },
      { name: 'startDay 26, 2026-09-26', input: { startDay: 26, iso: '2026-09-26' } },
      { name: 'startDay 26, 2026-01-01', input: { startDay: 26, iso: '2026-01-01' } },
      { name: 'startDay 26, 2026-12-31', input: { startDay: 26, iso: '2026-12-31' } },
      { name: 'startDay 31, 2026-02-28', input: { startDay: 31, iso: '2026-02-28' } },
      { name: 'startDay 31, 2026-03-01', input: { startDay: 31, iso: '2026-03-01' } },
      { name: 'startDay 31, 2026-03-31', input: { startDay: 31, iso: '2026-03-31' } },
      { name: 'startDay 31, 2026-04-30', input: { startDay: 31, iso: '2026-04-30' } },
    ] as { name: string; input: StartDayIsoInput }[],
    impl: (input: StartDayIsoInput) => {
      setActivePeriodStartDay(input.startDay)
      return periodKeyForDate(input.iso)
    },
  },
  periodElapsedFraction: {
    cases: [
      // startDay 1: progression through the period, plus a period key strictly before/after today.
      { name: 'startDay 1, today 2026-09-01, current period', input: { startDay: 1, periodKey: '2026-09', today: '2026-09-01' } },
      { name: 'startDay 1, today 2026-09-08, current period', input: { startDay: 1, periodKey: '2026-09', today: '2026-09-08' } },
      { name: 'startDay 1, today 2026-09-30, current period', input: { startDay: 1, periodKey: '2026-09', today: '2026-09-30' } },
      { name: 'startDay 1, today 2026-09-08, period before today', input: { startDay: 1, periodKey: '2026-08', today: '2026-09-08' } },
      { name: 'startDay 1, today 2026-09-08, period after today', input: { startDay: 1, periodKey: '2026-10', today: '2026-09-08' } },
      // startDay 26: around the period boundary.
      { name: 'startDay 26, today 2026-09-25, current period', input: { startDay: 26, periodKey: '2026-08', today: '2026-09-25' } },
      { name: 'startDay 26, today 2026-09-26, current period', input: { startDay: 26, periodKey: '2026-09', today: '2026-09-26' } },
      { name: 'startDay 26, today 2026-10-25, current period', input: { startDay: 26, periodKey: '2026-09', today: '2026-10-25' } },
      { name: 'startDay 26, today 2026-10-26, current period', input: { startDay: 26, periodKey: '2026-10', today: '2026-10-26' } },
      // DST month: startDay 1, today at the end of March.
      { name: 'startDay 1, today 2026-03-31 (DST), current period', input: { startDay: 1, periodKey: '2026-03', today: '2026-03-31' } },
      // startDay 15 across a DST-adjacent month.
      { name: 'startDay 15, today 2026-10-25, current period', input: { startDay: 15, periodKey: '2026-10', today: '2026-10-25' } },
    ] as { name: string; input: ElapsedFractionInput }[],
    impl: computeElapsedFraction,
  },
  periodLabel: {
    cases: [
      ...[1, 26].flatMap((startDay) =>
        LABEL_KEYS.flatMap((key) => LANGS.map((lang) => ({ name: `startDay ${startDay}, ${key}, ${lang}`, input: { startDay, key, lang } })))
      ),
      ...LANGS.map((lang) => ({ name: `startDay 31, 2026-02, ${lang}`, input: { startDay: 31, key: '2026-02', lang } })),
    ] as { name: string; input: LabelInput }[],
    impl: (input: LabelInput) => {
      setActivePeriodStartDay(input.startDay)
      setActiveLanguage(input.lang)
      return periodLabel(input.key)
    },
  },
  periodLabelShort: {
    cases: [
      ...[1, 26].flatMap((startDay) =>
        LABEL_KEYS.flatMap((key) => LANGS.map((lang) => ({ name: `startDay ${startDay}, ${key}, ${lang}`, input: { startDay, key, lang } })))
      ),
      ...LANGS.map((lang) => ({ name: `startDay 31, 2026-02, ${lang}`, input: { startDay: 31, key: '2026-02', lang } })),
    ] as { name: string; input: LabelInput }[],
    impl: (input: LabelInput) => {
      setActivePeriodStartDay(input.startDay)
      setActiveLanguage(input.lang)
      return periodLabelShort(input.key)
    },
  },
  periodLabelCompact: {
    cases: [
      ...[1, 26].flatMap((startDay) =>
        LABEL_KEYS.flatMap((key) => LANGS.map((lang) => ({ name: `startDay ${startDay}, ${key}, ${lang}`, input: { startDay, key, lang } })))
      ),
      ...LANGS.map((lang) => ({ name: `startDay 31, 2026-02, ${lang}`, input: { startDay: 31, key: '2026-02', lang } })),
    ] as { name: string; input: LabelInput }[],
    impl: (input: LabelInput) => {
      setActivePeriodStartDay(input.startDay)
      setActiveLanguage(input.lang)
      return periodLabelCompact(input.key)
    },
  },
  validStartDay: {
    cases: [1, 15, 31, 0, 32, 2.5, -1, '15', null, true].map((value) => ({
      name: `value ${JSON.stringify(value)}`,
      input: { value },
    })) as { name: string; input: ValidStartDayInput }[],
    impl: (input: ValidStartDayInput) => computeValidStartDay(input.value),
  },
})
