import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Label,
} from 'recharts'
import { LineChart as LineIcon, BarChart3, PieChart as PieIcon } from 'lucide-react'
import { fmtCompact, GRAN_WORD } from '../lib/brFormat'
import ChartTooltip from './ChartTooltip'

// Paleta profissional e sóbria (tom hospitalar).
const COLORS = [
  '#1e3a5f', '#3b82f6', '#059669', '#ea580c', '#64748b',
  '#0891b2', '#7c3aed', '#d97706', '#0d9488', '#9333ea',
]
const GRID = '#eef2f7'
const LABEL_FILL = '#334155'
const TICK = { fontSize: 12, fill: '#64748b' }
const tooltip = <ChartTooltip />
const legend = <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
const ANIM = { isAnimationActive: true, animationDuration: 800, animationEasing: 'ease-out', animationBegin: 0 }
const color = (i) => COLORS[i % COLORS.length]
const HeaderIcon = { line: LineIcon, lines: LineIcon, bar: BarChart3, bars: BarChart3, pie: PieIcon }

const lastValueLabel = (count, fill, fontSize) =>
  function LastValue({ x, y, value, index }) {
    if (index !== count - 1 || value == null) return null
    return <text x={x + 8} y={y} dy={4} fill={fill} fontSize={fontSize} fontWeight={600} textAnchor="start">{fmtCompact(value)}</text>
  }

const pieOuterLabel = (narrow) =>
  function PieLabel({ cx, cy, midAngle, outerRadius, value, percent }) {
    const RAD = Math.PI / 180
    const r = outerRadius + (narrow ? 12 : 18)
    const x = cx + r * Math.cos(-midAngle * RAD)
    const y = cy + r * Math.sin(-midAngle * RAD)
    return (
      <text x={x} y={y} fill={LABEL_FILL} fontSize={narrow ? 10 : 12} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${fmtCompact(value)} · ${Math.round(percent * 100)}%`}
      </text>
    )
  }

const pieCenterLabel = (total, narrow) =>
  function Center({ viewBox }) {
    const { cx, cy } = viewBox
    return (
      <g>
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#0f172a" fontSize={narrow ? 16 : 21} fontWeight={700}>{fmtCompact(total)}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fill="#64748b" fontSize={11}>total</text>
      </g>
    )
  }

function renderLineSeries(data, lines, narrow) {
  return (
    <LineChart data={data} margin={{ top: 12, right: 44, left: 4, bottom: 4 }}>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={false} />
      <YAxis tickFormatter={fmtCompact} tick={TICK} tickLine={false} axisLine={false} width={56} />
      <Tooltip content={tooltip} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
      {lines.length > 1 && legend}
      {lines.map(({ key, name }, i) => (
        <Line key={key} type="monotone" dataKey={key} name={name} stroke={color(i)} strokeWidth={2}
          dot={{ r: lines.length > 1 ? 2 : 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} {...ANIM}>
          <LabelList dataKey={key} content={lastValueLabel(data.length, color(i), narrow ? 10 : 12)} />
        </Line>
      ))}
    </LineChart>
  )
}

function renderBarSeries(data, bars, perColor, narrow) {
  const single = bars.length === 1
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 4 }}>
      <CartesianGrid horizontal={false} stroke={GRID} />
      <XAxis type="number" tickFormatter={fmtCompact} tick={TICK} tickLine={false} axisLine={false} />
      <YAxis type="category" dataKey="name" width={130} tick={TICK} tickLine={false} axisLine={false} />
      <Tooltip content={tooltip} cursor={{ fill: 'rgba(30,58,95,0.05)' }} />
      {!single && legend}
      {bars.map(({ key, name }, i) => (
        <Bar key={key} dataKey={key} name={name} fill={perColor ? undefined : color(i)}
          radius={[0, single ? 5 : 4, single ? 5 : 4, 0]} maxBarSize={single ? 26 : 16} {...ANIM}>
          {perColor && data.map((_, j) => <Cell key={j} fill={color(j)} />)}
          <LabelList dataKey={key} position="right" formatter={fmtCompact} fill={LABEL_FILL}
            fontSize={single ? (narrow ? 10 : 12) : (narrow ? 9 : 10)} />
        </Bar>
      ))}
    </BarChart>
  )
}

function renderPie(data, narrow) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0)
  return (
    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
        outerRadius={narrow ? 66 : 82} innerRadius={narrow ? 42 : 54} paddingAngle={2} stroke="#fff" strokeWidth={2}
        label={pieOuterLabel(narrow)} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} {...ANIM}>
        {data.map((_, i) => <Cell key={i} fill={color(i)} />)}
        <Label content={pieCenterLabel(total, narrow)} position="center" />
      </Pie>
      <Tooltip content={tooltip} />
      {legend}
    </PieChart>
  )
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = (e) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}

export default function ChartWidget({ chart }) {
  const narrow = useNarrow()
  const Icon = HeaderIcon[chart.type]
  const title = chart.gran ? `${chart.title} · por ${GRAN_WORD[chart.gran]}` : chart.title

  function renderChart() {
    switch (chart.type) {
      case 'line':
        return renderLineSeries(chart.data, [{ key: 'value', name: chart.measure }], narrow)
      case 'lines':
        return renderLineSeries(chart.data, chart.measures.map((m) => ({ key: m, name: m })), narrow)
      case 'bar':
        return renderBarSeries(chart.data, [{ key: 'value', name: chart.measure }], true, narrow)
      case 'bars':
        return renderBarSeries(chart.data, chart.measures.map((m) => ({ key: m, name: m })), false, narrow)
      case 'pie':
        return renderPie(chart.data, narrow)
      default:
        return null
    }
  }

  return (
    <div className="card chart-card">
      <h3>{Icon && <Icon size={16} className="chart-ic" />}{title}</h3>
      {chart.data && chart.data.length ? (
        <ResponsiveContainer width="100%" height={narrow ? 260 : 320}>{renderChart()}</ResponsiveContainer>
      ) : (
        <div className="empty-chart">Sem dados para exibir</div>
      )}
    </div>
  )
}
