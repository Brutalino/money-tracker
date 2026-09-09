import { parityModule } from './harness'
import { dayGap, reconcileMonth, suggestNote, type FinecoMovement, type ReconcileResult } from '../src/lib/fineco'
import { setActivePeriodStartDay } from '../src/lib/period'
import type { Transaction, TransactionType } from '../src/db/types'

interface SuggestNoteInput {
  description: string
  descriptionFull: string
}

interface DayGapInput {
  a: string
  b: string
}

interface ReconcileInput {
  appExpenses: Transaction[]
  appIncomes: Transaction[]
  movements: FinecoMovement[]
  coverage: { fromISO: string; toISO: string }
  range: { startISO: string; endISO: string }
  todayISO: string
  startDay: number
}

function tx(id: string, amountCents: number, type: TransactionType, date: string, recurringId?: string): Transaction {
  return { id, amountCents, type, categoryId: 'cat-x', date, recurringId }
}

function mov(dateISO: string, amountCents: number, direction: 'in' | 'out', description = '', descriptionFull = ''): FinecoMovement {
  return { dateISO, amountCents, direction, description, descriptionFull }
}

function computeReconcile(input: ReconcileInput): ReconcileResult {
  setActivePeriodStartDay(input.startDay)
  return reconcileMonth(input.appExpenses, input.appIncomes, input.movements, input.coverage, input.range, input.todayISO)
}

await parityModule('fineco', {
  suggestNote: {
    cases: [
      {
        name: 'Cino/ with Carta N. and IT country code',
        input: { description: 'ESSELUNGA MILANO', descriptionFull: 'Cino/ PAGAMENTO POS ESSELUNGA MILANO IT Carta N. 1234' },
      },
      {
        name: 'Cino (no slash) with Carta N. and LU country code',
        input: { description: 'SPOTIFY', descriptionFull: 'Cino PAYPAL *SPOTIFY 35314369001 LU Carta N. 5678' },
      },
      {
        name: 'no Carta N. in descriptionFull falls back to description (SEPA transfer)',
        input: { description: 'BONIFICO SEPA A FAVORE DI ROSSI MARIO', descriptionFull: 'BONIFICO SEPA A FAVORE DI ROSSI MARIO - CAUSALE AFFITTO SETTEMBRE' },
      },
      {
        name: 'Cino/ with Carta N. and no trailing digits',
        input: { description: 'AMAZON EU SARL', descriptionFull: 'Cino/ AMAZON EU SARL LU Carta N.' },
      },
      {
        name: 'lowercase input, case-insensitive Cino/Carta N./country code',
        input: { description: 'esselunga milano', descriptionFull: 'cino/ pagamento pos esselunga milano it carta n. 1234' },
      },
      {
        name: '3-char words stay unchanged (BAR, SRL)',
        input: { description: 'BAR SRL ROMA', descriptionFull: 'Cino/ BAR SRL ROMA IT Carta N. 111' },
      },
      {
        name: 'description over 40 chars gets cut to 40',
        input: {
          description: 'SUPERMERCATO ESSELUNGA VIA ROMA 123 MILANO CENTRO',
          descriptionFull: 'BONIFICO SUPERMERCATO ESSELUNGA VIA ROMA 123 MILANO CENTRO SENZA CARTA',
        },
      },
      {
        name: 'extra internal whitespace collapses to single spaces',
        input: { description: 'BAR   CENTRALE', descriptionFull: 'Cino/   PAGAMENTO   POS   BAR   CENTRALE   ROMA   IT   Carta N.   999' },
      },
      {
        name: 'empty description and descriptionFull',
        input: { description: '', descriptionFull: '' },
      },
      {
        name: 'country code mid-word (ITALIA) must not be stripped',
        input: { description: 'ASSICURAZIONE ITALIA SRL', descriptionFull: 'Cino/ ASSICURAZIONE ITALIA SRL Carta N. 222' },
      },
      {
        name: 'country code mid-word (PRESTITO) must not be stripped',
        input: { description: 'RATA PRESTITO BANCA', descriptionFull: 'RATA PRESTITO BANCA SENZA CARTA NE PAESE' },
      },
      {
        name: 'trailing NL country code',
        input: { description: 'BOOKING.COM', descriptionFull: 'Cino/ BOOKING.COM AMSTERDAM NL Carta N. 333' },
      },
      {
        name: 'trailing EE country code',
        input: { description: 'WISE PAYMENTS', descriptionFull: 'Cino/ WISE PAYMENTS TALLINN EE Carta N. 444' },
      },
      {
        name: 'trailing IE country code',
        input: { description: 'STRIPE PAYMENTS', descriptionFull: 'Cino/ STRIPE PAYMENTS DUBLIN IE Carta N. 555' },
      },
      {
        name: 'Cino not followed by whitespace or slash is not stripped',
        input: { description: 'CINOTTO ROMA', descriptionFull: 'CinottoBar ROMA Carta N. 666' },
      },
      {
        name: 'word containing digits is title-cased like any other word',
        input: { description: 'BAR2000 ROMA', descriptionFull: 'Cino/ PAGAMENTO POS BAR2000 ROMA IT Carta N. 777' },
      },
      {
        name: 'lowercase "carta n." is still found case-insensitively',
        input: { description: 'FARMACIA CENTRALE', descriptionFull: 'Cino/ FARMACIA CENTRALE ROMA carta n. 888' },
      },
      {
        name: 'no country code and no Carta N.: only whitespace cleanup and title-case apply',
        input: { description: 'RICARICA TELEFONICA', descriptionFull: 'Cino/ RICARICA TELEFONICA' },
      },
    ] as { name: string; input: SuggestNoteInput }[],
    impl: (input: SuggestNoteInput) => suggestNote(input.description, input.descriptionFull),
  },

  dayGap: {
    cases: [
      { name: 'same date', input: { a: '2026-09-08', b: '2026-09-08' } },
      { name: 'a before b, 2 days', input: { a: '2026-09-08', b: '2026-09-10' } },
      { name: 'a after b, 2 days', input: { a: '2026-09-10', b: '2026-09-08' } },
      { name: 'DST month, 2 days apart', input: { a: '2026-03-28', b: '2026-03-30' } },
      { name: '2 days apart in October', input: { a: '2026-10-24', b: '2026-10-26' } },
      { name: 'full non-leap year, Jan 1 to Dec 31', input: { a: '2026-01-01', b: '2026-12-31' } },
    ] as { name: string; input: DayGapInput }[],
    impl: (input: DayGapInput) => dayGap(input.a, input.b),
  },

  reconcileMonth: {
    cases: [
      {
        name: 'no movements in range, startDay 1: monthNotCovered with suggestedMonthKey from latest movement',
        input: {
          appExpenses: [],
          appIncomes: [],
          movements: [mov('2026-08-15', 5000, 'out'), mov('2026-08-20', 3000, 'out')],
          coverage: { fromISO: '2026-08-01', toISO: '2026-08-31' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-05',
          startDay: 1,
        },
      },
      {
        name: 'no movements in range, startDay 26: monthNotCovered with suggestedMonthKey from latest movement',
        input: {
          appExpenses: [],
          appIncomes: [],
          movements: [mov('2026-09-10', 5000, 'out'), mov('2026-09-20', 3000, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-25' },
          range: { startISO: '2026-09-26', endISO: '2026-10-25' },
          todayISO: '2026-09-25',
          startDay: 26,
        },
      },
      {
        name: 'exact matches at gap 0 and 4 succeed, gap 5 fails (no recurringId)',
        input: {
          appExpenses: [
            tx('e-gap0', 2000, 'expense', '2026-09-05'),
            tx('e-gap4', 3000, 'expense', '2026-09-06'),
            tx('e-gap5', 4000, 'expense', '2026-09-15'),
          ],
          appIncomes: [],
          movements: [mov('2026-09-05', 2000, 'out'), mov('2026-09-10', 3000, 'out'), mov('2026-09-20', 4000, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-10-05',
          startDay: 1,
        },
      },
      {
        name: 'recurring transaction matches at a 20-day gap',
        input: {
          appExpenses: [tx('e-rec', 1099, 'expense', '2026-09-01', 'rec-netflix')],
          appIncomes: [],
          movements: [mov('2026-09-21', 1099, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'two same-amount candidates: the closer one wins, the farther stays unmatched',
        input: {
          appExpenses: [tx('e-near', 2500, 'expense', '2026-09-16'), tx('e-far', 2500, 'expense', '2026-09-12')],
          appIncomes: [],
          movements: [mov('2026-09-15', 2500, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'same-day aggregation of 2 expenses and of 3 expenses',
        input: {
          appExpenses: [
            tx('e-agg1a', 300, 'expense', '2026-09-08'),
            tx('e-agg1b', 500, 'expense', '2026-09-08'),
            tx('e-agg2a', 300, 'expense', '2026-09-09'),
            tx('e-agg2b', 300, 'expense', '2026-09-09'),
            tx('e-agg2c', 300, 'expense', '2026-09-09'),
          ],
          appIncomes: [],
          movements: [mov('2026-09-08', 800, 'out'), mov('2026-09-09', 900, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'near-miss of 15 cents within 2 days accepted, 25 cents rejected',
        input: {
          appExpenses: [tx('e-nm-ok', 985, 'expense', '2026-09-12'), tx('e-nm-bad', 975, 'expense', '2026-09-13')],
          appIncomes: [],
          movements: [mov('2026-09-11', 1000, 'out'), mov('2026-09-13', 1000, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'canone refund pair (same date, same amount, opposite direction) is dropped',
        input: {
          appExpenses: [],
          appIncomes: [],
          movements: [
            mov('2026-09-05', 500, 'out', 'CANONE MENSILE', 'CANONE MENSILE CARTA'),
            mov('2026-09-05', 500, 'in', 'STORNO CANONE', 'STORNO CANONE MENSILE'),
          ],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'income exactly matched',
        input: {
          appExpenses: [],
          appIncomes: [tx('inc-salary', 150000, 'income', '2026-09-07')],
          movements: [mov('2026-09-07', 150000, 'in')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'partialTo from coverage ending before range end, and a transaction past coverage is excluded entirely',
        input: {
          appExpenses: [tx('e-partial', 2000, 'expense', '2026-09-10'), tx('e-late', 3000, 'expense', '2026-09-25')],
          appIncomes: [],
          movements: [mov('2026-09-10', 2000, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-20' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-18',
          startDay: 1,
        },
      },
      {
        name: 'totals and netGapCents with unmatched items on both sides',
        input: {
          appExpenses: [tx('e-t1', 1000, 'expense', '2026-09-03')],
          appIncomes: [tx('inc-t1', 500, 'income', '2026-09-05')],
          movements: [mov('2026-09-04', 1500, 'out'), mov('2026-09-06', 700, 'in')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
      {
        name: 'equal-date items in onlyApp and onlyBank expose tie order',
        input: {
          appExpenses: [tx('e-tie-a', 1111, 'expense', '2026-09-12'), tx('e-tie-b', 2222, 'expense', '2026-09-12')],
          appIncomes: [],
          movements: [mov('2026-09-14', 3333, 'out'), mov('2026-09-14', 4444, 'out')],
          coverage: { fromISO: '2026-09-01', toISO: '2026-09-30' },
          range: { startISO: '2026-09-01', endISO: '2026-09-30' },
          todayISO: '2026-09-30',
          startDay: 1,
        },
      },
    ] as { name: string; input: ReconcileInput }[],
    impl: computeReconcile,
  },
})

// ---- parseFinecoRows: the row-level parser (the xlsx reading stays in the
// app). Date cells travel in the fixture as { "$date": "yyyy-mm-dd" } and
// become local-midnight Date objects here, the way xlsx's cellDates yields them.
import { parseFinecoRows } from '../src/lib/fineco'
import { parseISODate } from '../src/lib/dates'

type Cell = string | number | null | { $date: string }
const D = (iso: string): Cell => ({ $date: iso })
const toRows = (rows: Cell[][]): unknown[][] =>
  rows.map((r) => r.map((c) => (c !== null && typeof c === 'object' && '$date' in c ? parseISODate(c.$date) : c)))

const preamble: Cell[][] = [
  ['Conto Corrente: 1234', null, null, null, null, null],
  ['Periodo Dal: 01/08/2026 Al: 31/08/2026', null, null, null, null, null],
  [null, null, null, null, null, null],
]
const header: Cell[] = ['Data_Operazione', 'Data_Valuta', 'Entrate', 'Uscite', 'Descrizione', 'Descrizione_Completa']

await parityModule('finecoRows', {
  parseFinecoRows: {
    cases: [
      { name: 'typical export with declared period', input: { rows: [...preamble, header,
        [D('2026-08-03'), D('2026-08-03'), null, -12.5, 'Pagamento POS', 'Cino/ PAGAMENTO POS ESSELUNGA MILANO IT Carta N. 1234'],
        [D('2026-08-05'), D('2026-08-06'), 1500, null, 'Stipendio', 'BONIFICO SEPA STIPENDIO'],
        [D('2026-08-07'), D('2026-08-07'), null, -3.4, 'Caffè', 'Cino/ BAR ROSSI'],
      ] } },
      { name: 'valuta date wins over operation date', input: { rows: [header,
        [D('2026-08-30'), D('2026-09-01'), null, -20, 'Pos', 'X'],
      ] } },
      { name: 'operation date used when valuta is missing', input: { rows: [header,
        [D('2026-08-30'), '-', null, -20, 'Autorizzato', 'X'],
      ] } },
      { name: 'row with dash operation date and no valuta is skipped', input: { rows: [header,
        ['-', '-', null, -20, 'Autorizzato', 'X'],
        [D('2026-08-02'), D('2026-08-02'), null, -1, 'ok', 'ok'],
      ] } },
      { name: 'rows without amounts are skipped', input: { rows: [header,
        [D('2026-08-02'), D('2026-08-02'), null, null, 'saldo', 'saldo'],
        [D('2026-08-02'), D('2026-08-02'), null, -9.99, 'x', 'y'],
      ] } },
      { name: 'coverage falls back to movement dates without a period row', input: { rows: [header,
        [D('2026-08-12'), D('2026-08-12'), null, -5, 'a', 'a'],
        [D('2026-08-03'), D('2026-08-03'), null, -6, 'b', 'b'],
      ] } },
      { name: 'no header is unrecognized', input: { rows: [...preamble, [D('2026-08-03'), D('2026-08-03'), null, -12.5, 'x', 'x']] } },
      { name: 'no movements is unrecognized', input: { rows: [header] } },
      { name: 'positive uscite value is still an outflow', input: { rows: [header,
        [D('2026-08-03'), D('2026-08-03'), null, 12.5, 'x', 'x'],
      ] } },
      { name: 'cents rounding', input: { rows: [header,
        [D('2026-08-03'), D('2026-08-03'), null, -10.005, 'x', 'x'],
        [D('2026-08-03'), D('2026-08-03'), 0.1, null, 'y', 'y'],
      ] } },
    ],
    impl: (input: { rows: Cell[][] }) => parseFinecoRows(toRows(input.rows)),
  },
})
