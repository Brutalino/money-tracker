import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'
import { formatCents } from '../../lib/money'

export interface IncomeExpenseDatum {
  monthKey: string
  monthShortLabel: string
  entrateCents: number
  usciteCents: number
}

interface Props {
  data: IncomeExpenseDatum[]
}

interface SimpleTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: IncomeExpenseDatum }>
  label?: string | number
}

function CustomTooltip({ active, payload, label }: SimpleTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipDot} style={{ background: 'var(--series-1)' }} />
        <span>Entrate</span>
        <span className={styles.tooltipValue}>{formatCents(d.entrateCents)}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipDot} style={{ background: 'var(--series-8)' }} />
        <span>Uscite</span>
        <span className={styles.tooltipValue}>{formatCents(d.usciteCents)}</span>
      </div>
    </div>
  )
}

export function IncomeExpenseChart({ data }: Props) {
  const hasData = data.some((d) => d.entrateCents > 0 || d.usciteCents > 0)
  return (
    <div>
      <div className={styles.legend} style={{ marginTop: 0, marginBottom: 10 }}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--series-1)' }} />
          <span>Entrate</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--series-8)' }} />
          <span>Uscite</span>
        </div>
      </div>
      {!hasData ? (
        <div className={styles.emptyChart}>Nessun dato per gli ultimi mesi</div>
      ) : (
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="monthShortLabel"
                tickLine={false}
                axisLine={{ stroke: 'var(--baseline)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <Tooltip
                content={(p) => (
                  <CustomTooltip
                    active={p.active}
                    payload={p.payload as SimpleTooltipProps['payload']}
                    label={p.label}
                  />
                )}
                cursor={{ fill: 'var(--gridline)', opacity: 0.4 }}
              />
              <Bar
                dataKey="entrateCents"
                fill="var(--series-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
                isAnimationActive={false}
              />
              <Bar
                dataKey="usciteCents"
                fill="var(--series-8)"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
