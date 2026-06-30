import { useId } from 'react'

// Mini-gráfico de tendência, SVG puro (sem dependências). A cor vem do
// `currentColor` — quem usa define `style={{ color }}` ou a prop `color`.
export default function Sparkline({ data, color = 'currentColor', height = 34 }) {
  const uid = useId().replace(/:/g, '')
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
        d={line} fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
