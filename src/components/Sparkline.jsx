import { useId, useEffect, useRef } from 'react'

// Mini-gráfico de tendência, SVG puro (sem dependências). A cor vem do
// `currentColor` — quem usa define `style={{ color }}` ou a prop `color`.
// Anima o traçado (stroke-dasharray) na primeira renderização para dar movimento.
export default function Sparkline({ data, color = 'currentColor', height = 34 }) {
  const uid = useId().replace(/:/g, '')
  const pathRef = useRef(null)
  
  // Anima o traçado da linha na montagem — stroke-dashoffset de 100% → 0 em ~800ms.
  // Respeita `prefers-reduced-motion` do sistema.
  useEffect(() => {
    if (!pathRef.current || !data || data.length < 2) return
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    
    const len = pathRef.current.getTotalLength?.()
    if (!len) return
    
    pathRef.current.style.strokeDasharray = len
    pathRef.current.style.strokeDashoffset = len
    pathRef.current.style.transition = `stroke-dashoffset 800ms cubic-bezier(0.34, 1.56, 0.64, 1)`
    
    // Força reflow para disparar a animação
    pathRef.current.offsetHeight
    pathRef.current.style.strokeDashoffset = '0'
  }, [data])
  
  if (!data || data.length < 2) return null

  const W = 100, H = 32, PAD = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const n = data.length
  const x = (i) => (i / (n - 1)) * W
  const y = (v) => H - PAD - ((v - min) / span) * (H - PAD * 2)
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const line = 'M' + pts.join(' L')
  const area = `${line} L${W},${H} L0,${H} Z`

  return (
    <svg
      className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ color, height }} aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${uid})`} stroke="none" />
      <path
        ref={pathRef}
        d={line} fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
