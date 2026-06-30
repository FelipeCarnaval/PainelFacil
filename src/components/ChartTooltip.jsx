import { fmtNum } from '../lib/brFormat'

// Barras pintam com gradiente (fill="url(#pf-bar-N)"); aqui resolvemos essa
// referência para a cor sólida do gradiente, para a bolinha do tooltip.
function solidColor(c) {
  if (typeof c === 'string' && c.startsWith('url(') && typeof document !== 'undefined') {
    const id = c.slice(c.indexOf('#') + 1, c.lastIndexOf(')')).replace(/['"]/g, '')
    const stop = document.getElementById(id)?.querySelector('stop:last-child')
    if (stop) return stop.getAttribute('stop-color')
  }
  return c
}

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
            <span className="chart-tip-dot" style={{ background: solidColor(p.color || p.payload?.fill) }} />
            <span className="chart-tip-name">{p.name}</span>
            <span className="chart-tip-val">{fmtNum(p.value)}{pct}</span>
          </div>
        )
      })}
    </div>
  )
}
