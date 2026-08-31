// Fineco bank-statement reconciliation: parsing the .xlsx movements export
// and matching it against the app's own transactions for a month. Pure
// domain logic, no React imports — see src/screens/Report/FinecoCheckCard.tsx
// and FinecoCheckSheet.tsx for the UI that drives this.
import { db } from '../db/db'
import type { Transaction } from '../db/types'
import { parseISODate, toISODate } from './dates'
import { periodKeyForDate } from './period'

export interface FinecoMovement {
  dateISO: string
  /** Always positive; see `direction` for the sign. */
  amountCents: number
  direction: 'in' | 'out'
  /** Short "Descrizione" column. */
  description: string
  /** Full "Descrizione_Completa" column. */
  descriptionFull: string
}

export type FinecoParseResult =
  | { ok: true; movements: FinecoMovement[]; coverage: { fromISO: string; toISO: string } }
  | { ok: false; reason: 'unrecognized' }

const HEADER_FIRST_CELL = 'Data_Operazione'

// Matches the metadata row declaring the export's true requested range, e.g.
// "Periodo Dal: 02/06/2026 Al: 31/08/2026" — the authoritative coverage, since
// the last day(s) of that range can have zero movements (nothing spent) while
// still being "covered" (nothing to flag as missing from the app either).
const PERIODO_RE = /Periodo Dal:\s*(\d{2})\/(\d{2})\/(\d{4})\s*Al:\s*(\d{2})\/(\d{2})\/(\d{4})/

/** Scans the metadata rows above the header for the declared "Periodo Dal/Al"
 * range. Returns null if absent (caller falls back to movement min/max). */
function findDeclaredCoverage(rows: unknown[][], headerIdx: number): { fromISO: string; toISO: string } | null {
  for (let i = 0; i < headerIdx; i++) {
    const row = rows[i]
    if (!row) continue
    for (const cell of row) {
      if (typeof cell !== 'string') continue
      const match = cell.match(PERIODO_RE)
      if (!match) continue
      const [, d1, m1, y1, d2, m2, y2] = match
      return { fromISO: `${y1}-${m1}-${d1}`, toISO: `${y2}-${m2}-${d2}` }
    }
  }
  return null
}

/** Parses a Fineco "Movimenti" export (.xlsx). Loads the `xlsx` library lazily
 * so it never lands in the main bundle — only pulled in when a file is
 * actually parsed. */
export async function parseFinecoFile(buf: ArrayBuffer): Promise<FinecoParseResult> {
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buf, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
    if (!sheet) return { ok: false, reason: 'unrecognized' }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
    const headerIdx = rows.findIndex((row) => row[0] === HEADER_FIRST_CELL)
    if (headerIdx === -1) return { ok: false, reason: 'unrecognized' }

    const movements: FinecoMovement[] = []
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      const [dataOperazione, dataValuta, entrate, uscite, descrizione, descrizioneCompleta] = row

      const entrateNum = typeof entrate === 'number' ? entrate : null
      const usciteNum = typeof uscite === 'number' ? uscite : null
      if (entrateNum === null && usciteNum === null) continue // neither: skip

      const direction: 'in' | 'out' = entrateNum !== null ? 'in' : 'out'
      const amount = entrateNum !== null ? entrateNum : (usciteNum as number)

      // Movement date = Data_Valuta (real payment day), falling back to
      // Data_Operazione (which can be the literal string '-' for a
      // not-yet-settled "Autorizzato" row).
      const dateSource = dataValuta instanceof Date ? dataValuta : dataOperazione instanceof Date ? dataOperazione : null
      if (!dateSource) continue

      movements.push({
        dateISO: toISODate(dateSource),
        amountCents: Math.round(Math.abs(amount) * 100),
        direction,
        description: typeof descrizione === 'string' ? descrizione : '',
        descriptionFull: typeof descrizioneCompleta === 'string' ? descrizioneCompleta : '',
      })
    }

    if (movements.length === 0) return { ok: false, reason: 'unrecognized' }

    const dates = movements.map((m) => m.dateISO)
    const coverage = findDeclaredCoverage(rows, headerIdx) ?? { fromISO: minISO(dates), toISO: maxISO(dates) }
    return { ok: true, movements, coverage }
  } catch {
    return { ok: false, reason: 'unrecognized' }
  }
}

/** A cleaned-up merchant name for prefilling the quick-entry note. Heuristic
 * only — the note stays editable, it just needs to be reasonable. */
export function suggestNote(description: string, descriptionFull: string): string {
  let s = (descriptionFull ?? '').replace(/^Cino[\s/]+/i, '').trim()

  const cartaMatch = s.search(/ Carta N\./i)
  if (cartaMatch !== -1) {
    s = s.slice(0, cartaMatch)
  } else {
    // SEPA direct debits / bank transfers don't carry a clean merchant name
    // in Descrizione_Completa: fall back to the short Descrizione.
    s = description ?? ''
  }

  // Strip a trailing country-code token (card-network noise) and anything after it.
  s = s.replace(/\s+(IT|IE|LU|NL|EE)\b.*$/i, '')
  s = s.replace(/\s+/g, ' ').trim()

  s = s
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')

  if (s.length > 40) s = s.slice(0, 40).trim()
  return s
}

export interface NearMiss {
  tx: Transaction
  movement: FinecoMovement
  diffCents: number
}

export interface ReconcileTotals {
  appOutCents: number
  bankOutCents: number
  appInCents: number
  bankInCents: number
}

export type ReconcileResult =
  | {
      state: 'monthNotCovered'
      coverage: { fromISO: string; toISO: string }
      suggestedMonthKey: string | null
    }
  | {
      state: 'done'
      /** Number of app transactions matched (pass 1 + pass 2, i.e. excluding near-misses). */
      matchedCount: number
      /** Total bank movements considered (after dropping canone pairs). */
      totalBankMovements: number
      nearMisses: NearMiss[]
      onlyApp: Transaction[]
      onlyBank: FinecoMovement[]
      totals: ReconcileTotals
      /** (bankOut − appOut) − (bankIn − appIn): positive means the bank shows
       * more outflow (or less inflow) than the app. */
      netGapCents: number
      /** Set when the file's coverage ends before the month does: the tail of
       * the month past this ISO date could not be checked. */
      partialTo?: string
    }

const EXACT_MATCH_MAX_GAP_DAYS = 4
const NEAR_MISS_MAX_DIFF_CENTS = 20
const NEAR_MISS_MAX_GAP_DAYS = 2
const AGGREGATION_MIN_SIZE = 2
const AGGREGATION_MAX_SIZE = 4

function minISO(dates: string[]): string {
  return dates.reduce((a, b) => (b < a ? b : a))
}

function maxISO(dates: string[]): string {
  return dates.reduce((a, b) => (b > a ? b : a))
}

/** Absolute number of days between two ISO dates. Exported for the result UI
 * (e.g. to word "same day" vs "N days apart" on a near-miss pill). */
export function dayGap(isoA: string, isoB: string): number {
  const ms = parseISODate(isoA).getTime() - parseISODate(isoB).getTime()
  return Math.abs(Math.round(ms / 86_400_000))
}

function txDirection(t: Transaction): 'in' | 'out' {
  return t.type === 'expense' ? 'out' : 'in'
}

/** All `size`-length combinations of `items`, preserving relative order. */
function combinations<T>(items: T[], size: number): T[][] {
  const results: T[][] = []
  function helper(start: number, combo: T[]) {
    if (combo.length === size) {
      results.push([...combo])
      return
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i])
      helper(i + 1, combo)
      combo.pop()
    }
  }
  helper(0, [])
  return results
}

/**
 * Reconciles one month of app transactions against the parsed Fineco
 * movements. `appExpenses`/`appIncomes` should already be scoped to the
 * month (e.g. via `getMonthTransactions`), `coverage` is the parsed file's
 * declared range (`FinecoParseResult.coverage` — the export's own "Periodo
 * Dal/Al", falling back to movement min/max when that metadata row is
 * absent), `range` to the month's period bounds (`periodStartISO`/
 * `periodEndISO`), and `todayISO` to the real current date — used, alongside
 * the file's coverage, to cap how far into the month the check can reach (a
 * file exported today obviously can't yet show a bill scheduled for later
 * this month).
 */
export function reconcileMonth(
  appExpenses: Transaction[],
  appIncomes: Transaction[],
  movements: FinecoMovement[],
  coverage: { fromISO: string; toISO: string },
  range: { startISO: string; endISO: string },
  todayISO: string
): ReconcileResult {
  const inRange = movements.filter((m) => m.dateISO >= range.startISO && m.dateISO <= range.endISO)

  if (inRange.length === 0) {
    // The declared coverage is what we tell the user ("the file covers
    // from/to"), but the suggested month must come from where movements
    // actually are — a declared range extending past the last real movement
    // must not suggest a month that would itself have zero movements.
    const suggestedMonthKey = movements.length > 0 ? periodKeyForDate(maxISO(movements.map((m) => m.dateISO))) : null
    return { state: 'monthNotCovered', coverage, suggestedMonthKey }
  }

  // The file's own declared coverage (not just what falls in this month's
  // range, and not just where movements happen to exist) tells us whether it
  // runs out before the month does.
  const coverageEndISO = minISO([range.endISO, coverage.toISO, todayISO])
  const coverageStartISO = coverage.fromISO > range.startISO ? coverage.fromISO : range.startISO
  const partialTo = coverageEndISO < range.endISO ? coverageEndISO : undefined

  let bankMovements = inRange
  const expenses = appExpenses.filter((t) => t.date >= coverageStartISO && t.date <= coverageEndISO)
  const incomes = appIncomes.filter((t) => t.date >= coverageStartISO && t.date <= coverageEndISO)

  // Drop Fineco's own monthly-fee refund pairs: two same-day, same-amount,
  // opposite-direction movements both mentioning "Canone".
  const droppedIdx = new Set<number>()
  const isCanone = (m: FinecoMovement) => /canone/i.test(m.description) || /canone/i.test(m.descriptionFull)
  for (let i = 0; i < bankMovements.length; i++) {
    if (droppedIdx.has(i) || !isCanone(bankMovements[i])) continue
    for (let j = i + 1; j < bankMovements.length; j++) {
      if (droppedIdx.has(j)) continue
      const a = bankMovements[i]
      const b = bankMovements[j]
      if (a.dateISO !== b.dateISO || a.amountCents !== b.amountCents || a.direction === b.direction) continue
      if (!isCanone(b)) continue
      droppedIdx.add(i)
      droppedIdx.add(j)
      break
    }
  }
  bankMovements = bankMovements.filter((_, idx) => !droppedIdx.has(idx))

  const indexed = bankMovements.map((m, idx) => ({ m, idx })).sort((a, b) => (a.m.dateISO < b.m.dateISO ? -1 : a.m.dateISO > b.m.dateISO ? 1 : 0))
  const allAppTx = [...expenses, ...incomes]
  const matchedTxIds = new Set<string>()
  const matchedMovementIdx = new Set<number>()

  // Pass 1: exact amount + direction match, greedy smallest date gap.
  // Recurring-linked transactions (always materialized on the 1st) are
  // allowed any gap inside the range instead of the usual 4-day cap.
  for (const { m, idx } of indexed) {
    let best: { tx: Transaction; gap: number } | null = null
    for (const tx of allAppTx) {
      if (matchedTxIds.has(tx.id)) continue
      if (txDirection(tx) !== m.direction || tx.amountCents !== m.amountCents) continue
      const gap = dayGap(tx.date, m.dateISO)
      if (!tx.recurringId && gap > EXACT_MATCH_MAX_GAP_DAYS) continue
      if (!best || gap < best.gap) best = { tx, gap }
    }
    if (best) {
      matchedTxIds.add(best.tx.id)
      matchedMovementIdx.add(idx)
    }
  }

  // Pass 2: same-day aggregation for remaining 'out' movements (e.g. two
  // 2,00€ bus rides billed as one 4,00€ transit charge).
  for (const { m, idx } of indexed) {
    if (matchedMovementIdx.has(idx) || m.direction !== 'out') continue
    const candidates = expenses.filter((t) => !matchedTxIds.has(t.id) && t.date === m.dateISO)
    let found: Transaction[] | null = null
    for (let size = AGGREGATION_MIN_SIZE; size <= AGGREGATION_MAX_SIZE && !found; size++) {
      if (candidates.length < size) continue
      for (const combo of combinations(candidates, size)) {
        if (combo.reduce((s, t) => s + t.amountCents, 0) === m.amountCents) {
          found = combo
          break
        }
      }
    }
    if (found) {
      for (const t of found) matchedTxIds.add(t.id)
      matchedMovementIdx.add(idx)
    }
  }

  const matchedCount = matchedTxIds.size

  // Pass 3: near-misses (same direction, tiny amount + date differences),
  // greedy smallest amount difference first.
  const nearMissCandidates: { tx: Transaction; movement: FinecoMovement; movementIdx: number; diffCents: number; gap: number }[] = []
  for (const { m, idx } of indexed) {
    if (matchedMovementIdx.has(idx)) continue
    for (const tx of allAppTx) {
      if (matchedTxIds.has(tx.id) || txDirection(tx) !== m.direction) continue
      const diffCents = Math.abs(tx.amountCents - m.amountCents)
      if (diffCents > NEAR_MISS_MAX_DIFF_CENTS) continue
      const gap = dayGap(tx.date, m.dateISO)
      if (gap > NEAR_MISS_MAX_GAP_DAYS) continue
      nearMissCandidates.push({ tx, movement: m, movementIdx: idx, diffCents, gap })
    }
  }
  nearMissCandidates.sort((a, b) => a.diffCents - b.diffCents || a.gap - b.gap)

  const nearMisses: NearMiss[] = []
  for (const cand of nearMissCandidates) {
    if (matchedTxIds.has(cand.tx.id) || matchedMovementIdx.has(cand.movementIdx)) continue
    matchedTxIds.add(cand.tx.id)
    matchedMovementIdx.add(cand.movementIdx)
    nearMisses.push({ tx: cand.tx, movement: cand.movement, diffCents: cand.diffCents })
  }

  const totals: ReconcileTotals = {
    appOutCents: expenses.reduce((s, t) => s + t.amountCents, 0),
    bankOutCents: bankMovements.filter((m) => m.direction === 'out').reduce((s, m) => s + m.amountCents, 0),
    appInCents: incomes.reduce((s, t) => s + t.amountCents, 0),
    bankInCents: bankMovements.filter((m) => m.direction === 'in').reduce((s, m) => s + m.amountCents, 0),
  }
  const netGapCents = totals.bankOutCents - totals.appOutCents - (totals.bankInCents - totals.appInCents)

  const onlyApp = allAppTx.filter((t) => !matchedTxIds.has(t.id)).sort((a, b) => (a.date < b.date ? -1 : 1))
  const onlyBank = bankMovements
    .filter((_, idx) => !matchedMovementIdx.has(idx))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1))

  return {
    state: 'done',
    matchedCount,
    totalBankMovements: bankMovements.length,
    nearMisses,
    onlyApp,
    onlyBank,
    totals,
    netGapCents,
    partialTo,
  }
}

const FINECO_VERIFIED_PREFIX = 'fineco-verified:'

/** ISO date the month was last verified as reconciling ('ok' verdict), or null. */
export async function getFinecoVerifiedDate(monthKey: string): Promise<string | null> {
  const rec = await db.settings.get(`${FINECO_VERIFIED_PREFIX}${monthKey}`)
  return typeof rec?.value === 'string' ? rec.value : null
}

export async function setFinecoVerifiedDate(monthKey: string, dateISO: string): Promise<void> {
  await db.settings.put({ key: `${FINECO_VERIFIED_PREFIX}${monthKey}`, value: dateISO })
}
