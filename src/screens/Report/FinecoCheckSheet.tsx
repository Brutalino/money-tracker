import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/ui/Sheet'
import { TransactionRow } from '../../components/TransactionRow'
import { QuickEntrySheet } from '../../components/QuickEntry/QuickEntrySheet'
import { IconPlus } from '../../components/Icons'
import styles from './FinecoCheckSheet.module.css'
import { useAllCategoriesMap } from '../../hooks/useDb'
import { getMonthTransactions } from '../../lib/stats'
import { periodStartISO, periodEndISO, periodLabel } from '../../lib/period'
import { todayISO, dayMonthLabel } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import { reconcileMonth, suggestNote, setFinecoVerifiedDate, dayGap } from '../../lib/fineco'
import type { FinecoParseResult, FinecoMovement, NearMiss, ReconcileResult } from '../../lib/fineco'
import { useT } from '../../i18n'
import type { TranslationKeys } from '../../i18n/types'
import type { Category, Transaction } from '../../db/types'

interface Props {
  parseResult: FinecoParseResult
  fileName: string
  /** The Report tab's month at the time the file was loaded; the sheet can
   * move to a different (suggested) month internally without re-parsing. */
  month: string
  onClose: () => void
  onPickAnotherFile: () => void
}

type Verdict = 'ok' | 'minor' | 'big'

function computeVerdict(result: Extract<ReconcileResult, { state: 'done' }>): Verdict {
  if (result.nearMisses.length === 0 && result.onlyApp.length === 0 && result.onlyBank.length === 0) return 'ok'
  if (Math.abs(result.netGapCents) > 1000) return 'big'
  return 'minor'
}

export function FinecoCheckSheet({ parseResult, fileName, month, onClose, onPickAnotherFile }: Props) {
  const t = useT()
  const categoryById = useAllCategoriesMap()
  const [activeMonth, setActiveMonth] = useState(month)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [addingMovement, setAddingMovement] = useState<FinecoMovement | null>(null)

  const movements = useMemo(() => (parseResult.ok ? parseResult.movements : []), [parseResult])
  // Unused when parseResult isn't ok (that branch returns before reading
  // reconcileResult below), so the fallback value here is never surfaced.
  const coverage = parseResult.ok ? parseResult.coverage : { fromISO: '', toISO: '' }
  const range = useMemo(
    () => ({ startISO: periodStartISO(activeMonth), endISO: periodEndISO(activeMonth) }),
    [activeMonth]
  )
  const monthTx = useLiveQuery(() => getMonthTransactions(activeMonth), [activeMonth])

  const reconcileResult = useMemo(
    () => reconcileMonth(monthTx?.expenses ?? [], monthTx?.incomes ?? [], movements, coverage, range, todayISO()),
    [monthTx, movements, coverage, range]
  )

  const verdict = reconcileResult.state === 'done' ? computeVerdict(reconcileResult) : null

  // Live recompute: whenever the reconciliation resolves to 'ok' (including
  // right after the user fixes the last difference), record the verified flag.
  useEffect(() => {
    if (reconcileResult.state === 'done' && verdict === 'ok') {
      void setFinecoVerifiedDate(activeMonth, todayISO())
    }
  }, [reconcileResult.state, verdict, activeMonth])

  if (!parseResult.ok) {
    return (
      <Sheet variant="full" hideHeader onClose={onClose}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <button type="button" className={styles.backRow} onClick={onClose}>
              ‹ {t.finecoCheck.backToReport}
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.hero}>
              <div className={styles.heroEmoji}>📄</div>
              <div className={styles.heroTitle}>{t.finecoCheck.unrecognizedTitle}</div>
              <div className={styles.heroSub}>{fileName}</div>
            </div>
            <div className="card">
              <div className={styles.bodyText}>{t.finecoCheck.unrecognizedBody}</div>
              <ol className={styles.stepsList}>
                {t.finecoCheck.unrecognizedSteps.map((step, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 12 }}
              onClick={onPickAnotherFile}
            >
              {t.finecoCheck.chooseAnotherFile}
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  if (reconcileResult.state === 'monthNotCovered') {
    const suggestedKey = reconcileResult.suggestedMonthKey
    return (
      <Sheet variant="full" hideHeader onClose={onClose}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <button type="button" className={styles.backRow} onClick={onClose}>
              ‹ {t.finecoCheck.backToReport}
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.hero}>
              <div className={styles.heroEmoji}>📅</div>
              <div className={styles.heroTitle}>{t.finecoCheck.notCoveredTitle(periodLabel(activeMonth))}</div>
              <div className={styles.heroSub}>
                {t.finecoCheck.notCoveredSub(
                  dayMonthLabel(reconcileResult.coverage.fromISO),
                  dayMonthLabel(reconcileResult.coverage.toISO)
                )}
              </div>
            </div>
            {suggestedKey && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setActiveMonth(suggestedKey)}
              >
                {t.finecoCheck.verifyMonthButton(periodLabel(suggestedKey))}
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 10 }}
              onClick={onPickAnotherFile}
            >
              {t.finecoCheck.chooseAnotherFile}
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  const result = reconcileResult
  const diffsCount = result.nearMisses.length + result.onlyApp.length + result.onlyBank.length
  const hasDiffs = diffsCount > 0

  let heroEmoji = '✅'
  let heroTitle = t.finecoCheck.okTitle(periodLabel(activeMonth))
  let heroSub = t.finecoCheck.okSub(result.totalBankMovements, result.matchedCount)
  if (verdict === 'minor') {
    heroEmoji = '🧐'
    heroTitle = t.finecoCheck.minorTitle
    heroSub = t.finecoCheck.minorSub(result.matchedCount, diffsCount)
  } else if (verdict === 'big') {
    heroEmoji = '❗'
    heroTitle = t.finecoCheck.bigTitle
    heroSub =
      result.netGapCents > 0
        ? t.finecoCheck.bigSubBankMore(formatCents(Math.abs(result.netGapCents)))
        : t.finecoCheck.bigSubAppMore(formatCents(Math.abs(result.netGapCents)))
  }

  return (
    <>
      <Sheet variant="full" hideHeader onClose={onClose}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <button type="button" className={styles.backRow} onClick={onClose}>
              ‹ {t.finecoCheck.backToReport}
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.hero}>
              <div className={styles.heroEmoji}>{heroEmoji}</div>
              <div className={styles.heroTitle}>{heroTitle}</div>
              <div className={styles.heroSub}>{heroSub}</div>
            </div>

            {result.partialTo && (
              <div className={styles.warningBanner}>
                <span>⚠️</span>
                <span>{t.finecoCheck.partialBanner(dayMonthLabel(result.partialTo))}</span>
              </div>
            )}

            {result.nearMisses.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  {t.finecoCheck.nearMissSectionTitle(result.nearMisses.length)}
                </div>
                {result.nearMisses.map((nm, i) => (
                  <NearMissItem key={i} nearMiss={nm} categoryById={categoryById} t={t} onOpenTx={setEditingTx} />
                ))}
              </div>
            )}

            {result.onlyApp.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t.finecoCheck.onlyAppSectionTitle(result.onlyApp.length)}</div>
                <div className="card">
                  {result.onlyApp.map((tx, i) => (
                    <div key={tx.id}>
                      {i > 0 && <hr className="divider" />}
                      <TransactionRow transaction={tx} category={categoryById.get(tx.categoryId)} showDate />
                      <button
                        type="button"
                        className={`btn btn-ghost btn-block ${styles.rowActionBtn}`}
                        onClick={() => setEditingTx(tx)}
                      >
                        {t.finecoCheck.openExpenseButton}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.onlyBank.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  {t.finecoCheck.onlyBankSectionTitle(result.onlyBank.length)}
                </div>
                <div className="card">
                  {result.onlyBank.map((m, i) => (
                    <div key={i}>
                      {i > 0 && <hr className="divider" />}
                      <div className={styles.bankItem}>
                        <div className={styles.bankItemTop}>
                          <span className={styles.bankItemName}>{suggestNote(m.description, m.descriptionFull)}</span>
                          <span className={styles.bankItemAmount}>
                            {m.direction === 'out' ? '−' : '+'}
                            {formatCents(m.amountCents)}
                          </span>
                        </div>
                        <div className={styles.bankItemSub}>
                          {dayMonthLabel(m.dateISO)} · {m.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn btn-primary btn-block ${styles.rowActionBtn}`}
                        onClick={() => setAddingMovement(m)}
                      >
                        <IconPlus width={14} height={14} />
                        {t.finecoCheck.addToAppButton}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t.finecoCheck.totalsTitle}</div>
              <div className="card">
                <TotalsRow
                  label={t.finecoCheck.totalsExpensesLabel}
                  appCents={result.totals.appOutCents}
                  bankCents={result.totals.bankOutCents}
                  t={t}
                />
                <hr className="divider" style={{ margin: '8px 0' }} />
                <TotalsRow
                  label={t.finecoCheck.totalsIncomeLabel}
                  appCents={result.totals.appInCents}
                  bankCents={result.totals.bankInCents}
                  t={t}
                />
              </div>
            </div>

            {hasDiffs && <div className={styles.helpCard}>{t.finecoCheck.readingHelp}</div>}
          </div>
        </div>
      </Sheet>

      {editingTx && <QuickEntrySheet editingTransaction={editingTx} onClose={() => setEditingTx(null)} />}
      {addingMovement && (
        <QuickEntrySheet
          prefill={{
            type: addingMovement.direction === 'out' ? 'expense' : 'income',
            amountCents: addingMovement.amountCents,
            date: addingMovement.dateISO,
            note: suggestNote(addingMovement.description, addingMovement.descriptionFull),
          }}
          sourceBanner={t.finecoCheck.sourceBanner(
            suggestNote(addingMovement.description, addingMovement.descriptionFull) || addingMovement.description,
            dayMonthLabel(addingMovement.dateISO)
          )}
          onClose={() => setAddingMovement(null)}
        />
      )}
    </>
  )
}

function NearMissItem({
  nearMiss,
  categoryById,
  t,
  onOpenTx,
}: {
  nearMiss: NearMiss
  categoryById: Map<string, Category>
  t: TranslationKeys
  onOpenTx: (tx: Transaction) => void
}) {
  const { tx, movement, diffCents } = nearMiss
  const category = categoryById.get(tx.categoryId)
  const gap = dayGap(tx.date, movement.dateISO)
  const tag =
    gap === 0
      ? t.finecoCheck.nearMissTagSameDay(formatCents(diffCents))
      : t.finecoCheck.nearMissTagGap(gap, formatCents(diffCents))
  const categoryLabel = `${category?.emoji ?? '❓'} ${category?.name ?? t.common.other}`
  const appLabel = tx.note ? `${categoryLabel} · ${tx.note}` : categoryLabel

  return (
    <div className={styles.diffBox}>
      <div className={styles.diffLine}>
        {t.finecoCheck.inAppLabel} {appLabel} {formatCents(tx.amountCents)}
      </div>
      <div className={styles.diffLine}>
        {t.finecoCheck.onAccountLabel} {movement.description} {formatCents(movement.amountCents)}
      </div>
      <span className={styles.tag}>{tag}</span>
      {/* Lets the user fix the amount/date from here without leaving the
       * sheet: the reconciliation recomputes live once the edit is saved. */}
      <button
        type="button"
        className={`btn btn-ghost btn-block ${styles.rowActionBtn}`}
        onClick={() => onOpenTx(tx)}
      >
        {t.finecoCheck.openExpenseButton}
      </button>
    </div>
  )
}

function TotalsRow({
  label,
  appCents,
  bankCents,
  t,
}: {
  label: string
  appCents: number
  bankCents: number
  t: TranslationKeys
}) {
  const equal = appCents === bankCents
  return (
    <div className={styles.totalsRow}>
      <span className={styles.totalsLabel}>{label}</span>
      {equal ? (
        <span className={styles.totalsEqual}>
          {t.finecoCheck.totalsEqual} ({formatCents(appCents)})
        </span>
      ) : (
        <span className={styles.totalsValues}>
          {t.finecoCheck.totalsAppLabel} {formatCents(appCents)} · {t.finecoCheck.totalsBankLabel}{' '}
          {formatCents(bankCents)}
        </span>
      )}
    </div>
  )
}
