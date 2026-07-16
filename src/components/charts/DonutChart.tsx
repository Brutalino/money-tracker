import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'
import { formatCents } from '../../lib/money'

export interface DonutDatum {
  id: string
  name: string
  emoji: string
  color: string
  valueCents: number
}

interface Props {
  data: DonutDatum[]
  totalCents: number
  totalLabel?: string
}

interface SimpleTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: DonutDatum }>
}

function CustomTooltip({ active, payload }: SimpleTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipDot} style={{ background: d.color }} />
        <span>
          {d.emoji} {d.name}
        </span>
        <span className={styles.tooltipValue}>{formatCents(d.valueCents)}</span>
      </div>
    </div>
  )
}

export function DonutChart({ data, totalCents, totalLabel = 'Totale' }: Props) {
  if (data.length === 0) {
    return <div className={styles.emptyChart}>Nessuna spesa da mostrare</div>
  }
  return (
    <div>
      <div style={{ position: 'relative', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="valueCents"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={(p) => (
                <CustomTooltip active={p.active} payload={p.payload as SimpleTooltipProps['payload']} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
            {totalLabel}
          </span>
          <span style={{ fontSize: 19, fontWeight: 800 }}>{formatCents(totalCents)}</span>
        </div>
      </div>
      <div className={styles.legend}>
        {data.map((d) => (
          <div key={d.id} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: d.color }} />
            <span>
              {d.emoji} {d.name}
            </span>
            <span className={styles.legendValue}>{formatCents(d.valueCents)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
