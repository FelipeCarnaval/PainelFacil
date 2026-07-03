import { Grid3x3 } from 'lucide-react'
import { fmtCompact } from '../lib/brFormat'

// Cabeçalho no padrão do design system (ícone em tile gradiente + contexto).
function Header({ title, subtitle }) {
  return (
    <div className="panel-header">
      <span className="panel-icon" style={{ '--panel-grad': 'var(--grad-slate)' }} aria-hidden="true">
        <Grid3x3 size={17} strokeWidth={2.2} />
      </span>
      <div className="panel-heading">
        <h3 className="panel-title">{title}</h3>
        {subtitle && <p className="panel-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

// Presentacional: recebe a matriz já calculada pelo worker.
export default function PivotMatrix({ chart }) {
  const { rows, cols, matrix, max, rowDim, colDim, title } = chart

  if (!rows.length || !cols.length) {
    return (
      <div className="card pivot-card">
        <Header title={title} />
        <div className="empty-chart">Sem dados para exibir</div>
      </div>
    )
  }

  const heat = (v) => {
    if (!v || max <= 0) return 'transparent'
    const pct = (12 + 58 * (v / max)).toFixed(1)
    return `color-mix(in srgb, var(--c-blue-1) ${pct}%, var(--surface-solid))`
  }

  return (
    <div className="card pivot-card">
      <Header title={title} subtitle="células mais escuras concentram valores maiores" />
      <div className="pivot-scroll">
        <table className="pivot">
          <thead>
            <tr>
              <th className="corner">{rowDim} \ {colDim}</th>
              {cols.map((c) => <th key={c}>{c}</th>)}
              <th className="rowtotal">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((r) => (
              <tr key={r.row}>
                <th className="rowhead">{r.row}</th>
                {r.values.map((v, i) => (
                  <td key={i} style={{ background: heat(v) }}>{v ? fmtCompact(v) : '·'}</td>
                ))}
                <td className="rowtotal">{fmtCompact(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
