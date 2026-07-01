import { Sparkles, TrendingUp, TrendingDown, Trophy, PieChart } from 'lucide-react'
import { fmtCompact, periodLabel, GRAN_WORD } from '../lib/brFormat'

const pct = (x, dec = 1) => `${(Math.abs(x) * 100).toFixed(dec).replace('.', ',')}%`

// Transforma os fatos calculados no worker em frases em português.
function renderInsight(ins) {
  if (ins.type === 'trend') {
    const up = ins.delta >= 0
    return {
      Icon: up ? TrendingUp : TrendingDown,
      tone: up ? 'up' : 'down',
      text: (
        <>
          <b>{ins.measure}</b> {up ? 'subiu' : 'caiu'} <b>{pct(ins.delta)}</b> no último{' '}
          {GRAN_WORD[ins.gran]} ({periodLabel(ins.prevKey, ins.gran)} →{' '}
          {periodLabel(ins.lastKey, ins.gran)}).
        </>
      ),
    }
  }
  if (ins.type === 'peak') {
    return {
      Icon: Trophy,
      tone: 'gold',
      text: (
        <>
          Melhor {GRAN_WORD[ins.gran]}: <b>{periodLabel(ins.periodKey, ins.gran)}</b>, com{' '}
          <b>{fmtCompact(ins.value)}</b> em {ins.measure}
          {ins.share != null && <> ({pct(ins.share, 0)} do total)</>}.
        </>
      ),
    }
  }
  if (ins.type === 'concentration') {
    return {
      Icon: PieChart,
      tone: 'info',
      text: (
        <>
          <b>{ins.topKey}</b> concentra <b>{pct(ins.share, 0)}</b> de {ins.measure} entre{' '}
          {ins.groupCount} {ins.dim.toLowerCase()}(s).
        </>
      ),
    }
  }
  return null
}

// "Destaques": leituras automáticas dos dados filtrados (heurísticas do motor,
// zero IA/custo). Recalculam a cada filtro, como o resto do painel.
export default function InsightsPanel({ insights }) {
  const items = (insights || []).map(renderInsight).filter(Boolean)
  if (!items.length) return null
  return (
    <section className="insights" aria-label="Destaques automáticos">
      <h3 className="insights-title"><Sparkles size={15} /> Destaques</h3>
      <div className="insights-row">
        {items.map(({ Icon, tone, text }, i) => (
          <div className={`insight insight-${tone}`} key={i} style={{ '--i': i }}>
            <span className="insight-ic"><Icon size={16} strokeWidth={2.2} /></span>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
