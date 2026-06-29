import { fmtNum } from '../lib/brFormat'

// Tooltip profissional e único para todos os gráficos: cartão branco, borda suave,
// sombra leve, valores no padrão brasileiro, nome de cada medida e % (na rosca).
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tip">
      {label != null && label !== '' && <div className="chart-tip-title">{label}</div>}
      {payload.map((p, i) => {
        const pct = p.percent != null ? ` · ${Math.round(p.percent * 100)}%` : ''
        return (
          <div className="chart-tip-row" key={i}>
            <span className="chart-tip-dot" style={{ background: p.color || p.payload?.fill }} />
            <span className="chart-tip-name">{p.name}</span>
            <span className="chart-tip-val">{fmtNum(p.value)}{pct}</span>
          </div>
        )
      })}
    </div>
  )
}
