import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'
import { formatCents } from '../../lib/money'

export interface TrendDatum {
  monthKey: string
  monthShortLabel: string
  valueCents: number
}

interface Props {
  data: TrendDatum[]
  color?: string
}

interface SimpleTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: TrendDatum }>
  label?: string | number
}

function CustomTooltip({ active, payload, label }: SimpleTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipValue}>{formatCents(d.valueCents)}</span>
      </div>
    </div>
  )
}

export function TrendChart({ data, color = 'var(--series-1)' }: Props) {
  const hasData = data.some((d) => d.valueCents > 0)
  if (!hasData) {
    return <div className={styles.emptyChart}>Nessuna spesa in questa categoria</div>
  }
  return (
    <div style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            cursor={{ stroke: 'var(--baseline)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="valueCents"
            stroke={color}
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
