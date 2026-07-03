import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmtNum, fmtMoney, fmtCompact } from '../lib/brFormat'

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

const fmtPct = (p) => `${p.toFixed(p < 10 ? 1 : 0).replace('.', ',')}%`

/**
 * Tooltip único e contextual para todos os gráficos (cartão glass, padrão BR):
 * - `money`: valores com "R$";
 * - `total` (ranking): cada barra ganha o % do total exibido + linha de total;
 * - multi-série: séries além da 1ª ganham o % em relação à medida principal
 *   (ex.: Glosa = 8,9% do Apresentado — a taxa que interessa);
 * - `prevOf` (série temporal única): variação % vs. o período anterior.
 */
export default function ChartTooltip({ active, payload, label, money = false, total = null, prevOf = null }) {
  if (!active || !payload || !payload.length) return null
  const fmtVal = money ? fmtMoney : (v) => fmtNum(v)
  const multi = payload.length > 1
  const primary = Number(payload[0]?.value) || 0

  // Variação vs. período anterior (só para série única temporal).
  let delta = null
  if (prevOf && !multi) {
    const prev = prevOf(label)
    if (prev != null && prev !== 0) delta = (Number(payload[0].value) - prev) / prev
  }

  return (
    <div className="chart-tip">
      {label != null && label !== '' && <div className="chart-tip-title">{label}</div>}
      {payload.map((p, i) => {
        const v = Number(p.value) || 0
        let badge = null
        if (total > 0) {
          badge = { text: fmtPct((v / total) * 100), title: '% do total exibido' }
        } else if (multi && i > 0 && primary > 0) {
          badge = { text: fmtPct((v / primary) * 100), title: `em relação a ${payload[0].name}` }
        } else if (p.percent != null) {
          badge = { text: fmtPct(p.percent * 100), title: '% do total' }
        }
        return (
          <div className="chart-tip-row" key={i}>
            <span className="chart-tip-dot" style={{ background: solidColor(p.color || p.payload?.fill) }} />
            <span className="chart-tip-name">{p.name}</span>
            <span className="chart-tip-val">{fmtVal(v)}</span>
            {badge && <span className="chart-tip-pct" title={badge.title}>{badge.text}</span>}
          </div>
        )
      })}
      {total > 0 && (
        <div className="chart-tip-row chart-tip-total">
          <span className="chart-tip-name">Total exibido</span>
          <span className="chart-tip-val">{money ? `R$ ${fmtCompact(total)}` : fmtCompact(total)}</span>
        </div>
      )}
      {delta != null && (
        <span className={`chart-tip-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? <TrendingUp size={12} strokeWidth={2.6} /> : <TrendingDown size={12} strokeWidth={2.6} />}
          {fmtPct(Math.abs(delta) * 100)} vs. período anterior
        </span>
      )}
    </div>
  )
}
