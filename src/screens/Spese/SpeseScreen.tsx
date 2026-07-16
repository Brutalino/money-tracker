import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '../../components/Header'
import { MonthSelector } from '../../components/MonthSelector'
import { TransactionRow } from '../../components/TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { QuickEntrySheet } from '../../components/QuickEntry/QuickEntrySheet'
import { RecurringFormSheet } from './RecurringFormSheet'
import { IconPlus, IconSearch, IconChevronRight } from '../../components/Icons'
import styles from './SpeseScreen.module.css'
import { db } from '../../db/db'
import { getMonthTransactions, sumCents } from '../../lib/stats'
import { monthlyEquivalentCents } from '../../lib/recurring'
import { currentMonthKey, dayLabel } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import { useT } from '../../i18n'
import { localeTag } from '../../lib/locale'
import type { Transaction, Recurring } from '../../db/types'

interface Props {
  onOpenSettings: () => void
}

export function SpeseScreen({ onOpenSettings }: Props) {
  const t = useT()
  const [month, setMonth] = useState(currentMonthKey())
  const [search, setSearch] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [recurringSheet, setRecurringSheet] = useState<{ item: Recurring | null } | null>(null)
  const [fixedExpanded, setFixedExpanded] = useState(false)

  const data = useLiveQuery(async () => {
    const [monthTx, categories, recurringAll] = await Promise.all([
      getMonthTransactions(month),
      db.categories.toArray(),
      db.recurring.toArray(),
    ])
    return { monthTx, categories, recurringAll }
  }, [month])

  const categoryById = useMemo(
    () => new Map((data?.categories ?? []).map((c) => [c.id, c])),
    [data?.categories]
  )

  const filterableCategories = useMemo(
    () => (data?.categories ?? []).filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [data?.categories]
  )

  const fixedMonthlyTotalCents = useMemo(() => {
    if (!data) return 0
    return data.recurringAll
      .filter((r) => r.active && r.type === 'expense')
      .reduce((sum, r) => sum + monthlyEquivalentCents(r.amountCents, r.frequency), 0)
  }, [data])

  const dayGroups = useMemo(() => {
    if (!data) return []
    const filtered = data.monthTx.all.filter((t) => {
      if (filterCategoryId && t.categoryId !== filterCategoryId) return false
      if (search.trim() && !(t.note ?? '').toLowerCase().includes(search.trim().toLowerCase()))
        return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    const groups = new Map<string, Transaction[]>()
    for (const t of sorted) {
      const arr = groups.get(t.date) ?? []
      arr.push(t)
      groups.set(t.date, arr)
    }
    return Array.from(groups.entries())
  }, [data, filterCategoryId, search])

  if (!data) return null

  const entrate = sumCents(data.monthTx.incomes)
  const uscite = sumCents(data.monthTx.expenses)
  const saldo = entrate - uscite

  const sortedRecurring = [...data.recurringAll].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return a.name.localeCompare(b.name, localeTag())
  })

  return (
    <div className="screen-root">
      <Header title={t.nav.expenses} onOpenSettings={onOpenSettings} />
      <div className="screen-pad">
        <div className="card">
          <button
            type="button"
            className={styles.fixedHeaderRow}
            onClick={() => setFixedExpanded((v) => !v)}
            aria-expanded={fixedExpanded}
          >
            <div className={styles.fixedTitleWrap}>
              <div className={styles.fixedTitle}>
                {t.spese.fixedCostsHeader(sortedRecurring.filter((r) => r.active).length)}
              </div>
              <div className={styles.fixedTotal}>{formatCents(fixedMonthlyTotalCents)}</div>
            </div>
            <div className={styles.fixedHeaderActions}>
              <span
                className={styles.addBtn}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  setRecurringSheet({ item: null })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    setRecurringSheet({ item: null })
                  }
                }}
                aria-label={t.spese.addFixedCostAriaLabel}
              >
                <IconPlus width={16} height={16} />
              </span>
              <IconChevronRight
                width={16}
                height={16}
                className={styles.fixedChevron}
                style={{ transform: fixedExpanded ? 'rotate(90deg)' : 'none' }}
              />
            </div>
          </button>

          {fixedExpanded &&
            (sortedRecurring.length === 0 ? (
              <div className={styles.recurringList}>
                <p className="muted" style={{ fontSize: 12 }}>
                  {t.spese.noFixedCosts}
                </p>
              </div>
            ) : (
              <div className={styles.recurringList}>
                {sortedRecurring.map((r) => {
                  const cat = categoryById.get(r.categoryId)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`${styles.recurringRow} ${!r.active ? styles.inactive : ''}`}
                      onClick={() => setRecurringSheet({ item: r })}
                    >
                      <div className={styles.recurringEmoji} style={{ ['--cat-color' as string]: cat?.color }}>
                        {cat?.emoji ?? '❓'}
                      </div>
                      <div className={styles.recurringMain}>
                        <div className={styles.recurringName}>{r.name}</div>
                        <div className={styles.recurringMeta}>
                          {t.frequency[r.frequency]}
                          {!r.active ? t.spese.disabledSuffix : ''}
                        </div>
                      </div>
                      <div
                        className={styles.recurringAmount}
                        style={{ color: r.type === 'income' ? 'var(--status-good-text)' : undefined }}
                      >
                        {r.type === 'income' ? '+' : ''}
                        {t.common.perMonth(formatCents(monthlyEquivalentCents(r.amountCents, r.frequency)))}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
        </div>

        <MonthSelector month={month} onChange={setMonth} />

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.finance.incomePlural}</div>
            <div className={styles.statValue} style={{ color: 'var(--status-good-text)' }}>
              {formatCents(entrate)}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.finance.expensePlural}</div>
            <div className={styles.statValue}>{formatCents(uscite)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.finance.balance}</div>
            <div
              className={styles.statValue}
              style={{ color: saldo < 0 ? 'var(--status-critical)' : 'var(--status-good-text)' }}
            >
              {formatCents(saldo)}
            </div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div style={{ position: 'relative' }}>
            <IconSearch
              width={16}
              height={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className={styles.searchInput}
              style={{ paddingLeft: 34 }}
              placeholder={t.spese.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.chipRow}>
            <button
              type="button"
              className={`${styles.filterChip} ${!filterCategoryId ? styles.filterChipActive : ''}`}
              onClick={() => setFilterCategoryId(null)}
            >
              {t.common.all}
            </button>
            {filterableCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.filterChip} ${filterCategoryId === c.id ? styles.filterChipActive : ''}`}
                onClick={() => setFilterCategoryId(c.id)}
              >
                <span>{c.emoji}</span> {c.name}
              </button>
            ))}
          </div>
        </div>

        {dayGroups.length === 0 ? (
          <div className="card" style={{ marginTop: 14 }}>
            <EmptyState
              emoji="🧾"
              title={t.transactions.noneTitle}
              subtitle={t.spese.noTransactionsFilteredSubtitle}
            />
          </div>
        ) : (
          dayGroups.map(([date, txs]) => (
            <div key={date} className={styles.dayGroup}>
              <div className={styles.dayLabel}>{dayLabel(date)}</div>
              <div className="card" style={{ padding: '2px 14px' }}>
                {txs.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    category={categoryById.get(t.categoryId)}
                    onClick={() => setEditingTx(t)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {editingTx && <QuickEntrySheet editingTransaction={editingTx} onClose={() => setEditingTx(null)} />}
      {recurringSheet && (
        <RecurringFormSheet editing={recurringSheet.item} onClose={() => setRecurringSheet(null)} />
      )}
    </div>
  )
}
