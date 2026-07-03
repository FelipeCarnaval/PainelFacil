import { useEffect, useRef, useState } from 'react'
import { DollarSign, FileSpreadsheet, Activity, Percent, Sigma, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fmtInt, fmtCompact, fmtNum, MONEY_RX } from '../lib/brFormat'
import Sparkline from './Sparkline'

// Ícone + gradiente corporativo por natureza da métrica: dinheiro=azul-marinho,
// taxas/%=dourado, médias=petróleo, contagem=grafite.
function metaFor({ agg, measure = '', percent }) {
  if (agg === 'count') return { Icon: FileSpreadsheet, grad: 'slate' } // "Registros" = linhas da planilha
  if (percent) return { Icon: Percent, grad: 'gold' }
  if (agg === 'avg') return { Icon: Activity, grad: 'teal' }
  return MONEY_RX.test(measure) ? { Icon: DollarSign, grad: 'blue' } : { Icon: Sigma, grad: 'teal' }
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Anima o número do valor atual até o novo alvo (~0,6s, easeOutCubic). Em cada
// mudança de filtro, o KPI "conta" suavemente para o novo valor.
function useCountUp(target) {
  // Começa em 0 (anima na primeira renderização); em mudanças de filtro, anima
  // a partir do valor anterior. Quem prefere menos movimento já vê o valor final.
  const [shown, setShown] = useState(() => (reducedMotion() ? target : 0))
  const fromRef = useRef(reducedMotion() ? target : 0)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = Number.isFinite(target) ? target : 0
    if (reducedMotion() || from === to) {
      fromRef.current = to
      setShown(to)
      return
    }
    const dur = 600
    const t0 = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return shown
}

function TrendBadge({ trend }) {
  if (trend == null || !Number.isFinite(trend)) return null
  const dir = trend > 0.0005 ? 'up' : trend < -0.0005 ? 'down' : 'flat'
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus
  const pct = `${(Math.abs(trend) * 100).toFixed(1).replace('.', ',')}%`
  return (
    <span className={`kpi-trend ${dir}`} title="Variação do último período vs. o anterior">
      <Icon size={13} strokeWidth={2.6} />{dir === 'flat' ? '0%' : pct}
    </span>
  )
}

export default function KpiCard({ label, value, kind, agg, measure, percent, spark, trend, index = 0 }) {
  const { Icon, grad } = metaFor({ agg, measure, percent })
  const shown = useCountUp(value)
  const isMoney = agg !== 'count' && !percent && MONEY_RX.test(measure || '')
  const num =
    kind === 'int' ? fmtInt(shown) : Math.abs(shown) >= 10000 ? fmtCompact(shown) : fmtNum(shown)
  const display = percent ? `${num}%` : isMoney ? `R$ ${num}` : num

  return (
    <div
      className="kpi"
      style={{
        '--i': index,
        '--card-grad': `var(--grad-${grad})`,
        '--kpi-accent': `var(--c-${grad}-2)`,
      }}
    >
      <div className="kpi-top">
        <span className="kpi-ic"><Icon size={18} strokeWidth={2.2} /></span>
        <TrendBadge trend={trend} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{display}</div>
      {spark && spark.length > 1 && <Sparkline data={spark} color="var(--kpi-accent)" />}
    </div>
  )
}
