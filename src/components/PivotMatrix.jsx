import { Grid3x3 } from 'lucide-react'
import { fmtCompact } from '../lib/brFormat'

// Presentacional: recebe a matriz já calculada pelo worker.
export default function PivotMatrix({ chart }) {
  const { rows, cols, matrix, max, rowDim, colDim, title } = chart

  if (!rows.length || !cols.length) {
    return (
      <div className="card pivot-card">
        <h3><Grid3x3 size={16} className="chart-ic" />{title}</h3>
        <div className="empty-chart">Sem dados para exibir</div>
      </div>
    )
  }

  const heat = (v) => {
    if (!v || max <= 0) return 'transparent'
    const pct = (12 + 58 * (v / max)).toFixed(1)
    return `color-mix(in srgb, var(--primary) ${pct}%, var(--surface))`
  }

  return (
    <div className="card pivot-card">
      <h3><Grid3x3 size={16} className="chart-ic" />{title}</h3>
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
