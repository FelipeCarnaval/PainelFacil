import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Label,
} from 'recharts'
import { LineChart as LineIcon, BarChart3, PieChart as PieIcon, Maximize2, X, Download, Loader2 } from 'lucide-react'
import { fmtCompact, fmtNum, GRAN_WORD } from '../lib/brFormat'
import ChartTooltip from './ChartTooltip'

// Paletas categóricas VALIDADAS (colorblind-safe): 8 tons em ORDEM FIXA — a ordem
// é o mecanismo de segurança para daltonismo e nunca muda nem cicla. Validação
// (script Machado-2009): claro vs #ffffff → pior par adjacente ΔE 24,2; escuro vs
// #161d2e → ΔE 10,3 (faixa-piso, legal porque há rótulos diretos + legenda com valores).
const PALETTE_LIGHT = [
  '#2a78d6', '#1baf7a', '#eda100', '#008300',
  '#4a3aa7', '#e34948', '#e87ba4', '#eb6834',
]
const PALETTE_DARK = [
  '#3987e5', '#199e70', '#c98500', '#008300',
  '#9085e9', '#e66767', '#d55181', '#d95926',
]

const tooltip = <ChartTooltip />
const legend = <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
const ANIM = { isAnimationActive: true, animationDuration: 750, animationEasing: 'ease-out', animationBegin: 0 }
const HeaderIcon = { line: LineIcon, lines: LineIcon, bar: BarChart3, bars: BarChart3, pie: PieIcon }
const DRILLABLE = new Set(['bar', 'bars', 'pie'])

function readVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
function buildTheme() {
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
  return {
    dark,
    palette: dark ? PALETTE_DARK : PALETTE_LIGHT,
    grid: readVar('--border', dark ? '#283146' : '#eef2f7'),
    tick: readVar('--text-dim', '#64748b'),
    label: readVar('--text', '#334155'),
    surface: readVar('--surface', dark ? '#161d2e' : '#ffffff'),
    borderStrong: readVar('--border-strong', '#cbd5e1'),
    cursorFill: dark ? 'rgba(96,165,250,0.10)' : 'rgba(37,99,235,0.06)',
  }
}
function useChartTheme() {
  const [theme, setTheme] = useState(buildTheme)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(buildTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

function BarGradients({ palette }) {
  return (
    <defs>
      {palette.map((c, i) => (
        <linearGradient key={i} id={`pf-bar-${i}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c} stopOpacity={0.55} />
          <stop offset="100%" stopColor={c} stopOpacity={1} />
        </linearGradient>
      ))}
    </defs>
  )
}

const lastValueLabel = (count, fill, fontSize) =>
  function LastValue({ x, y, value, index }) {
    if (index !== count - 1 || value == null) return null
    return <text x={x + 8} y={y} dy={4} fill={fill} fontSize={fontSize} fontWeight={600} textAnchor="start">{fmtCompact(value)}</text>
  }

const pieCenterLabel = (total, theme) =>
  function Center({ viewBox }) {
    const { cx, cy } = viewBox
    return (
      <g>
        <text x={cx} y={cy - 4} textAnchor="middle" fill={theme.label} fontSize={22} fontWeight={700}>{fmtCompact(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill={theme.tick} fontSize={11}>total</text>
      </g>
    )
  }

// --- Corpos dos gráficos (recebem a altura para renderizar normal e em tela cheia) ---

function lineBody(data, lines, narrow, theme, height) {
  const tick = { fontSize: 12, fill: theme.tick }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 48, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtCompact} tick={tick} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={tooltip} cursor={{ stroke: theme.borderStrong }} />
        {legend}
        {lines.map(({ key, name }, i) => {
          const c = theme.palette[i % theme.palette.length]
          return (
            <Line key={key} type="monotone" dataKey={key} name={name} stroke={c} strokeWidth={2}
              dot={{ r: 2.4, strokeWidth: 0, fill: c }} activeDot={{ r: 5 }} {...ANIM}>
              {/* Rótulo só no último ponto, em tinta de texto (identidade fica na posição da linha). */}
              <LabelList dataKey={key} content={lastValueLabel(data.length, theme.label, narrow ? 10 : 12)} />
            </Line>
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

function areaBody(data, name, narrow, theme, height) {
  const tick = { fontSize: 12, fill: theme.tick }
  const c = theme.palette[0]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 48, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.34} />
            <stop offset="92%" stopColor={c} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtCompact} tick={tick} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={tooltip} cursor={{ stroke: theme.borderStrong }} />
        <Area type="monotone" dataKey="value" name={name} stroke={c} strokeWidth={2}
          fill="url(#pf-area)" dot={{ r: 2.4, strokeWidth: 0, fill: c }} activeDot={{ r: 5 }} {...ANIM}>
          <LabelList dataKey="value" content={lastValueLabel(data.length, theme.label, narrow ? 10 : 12)} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Ranking de série única: TODAS as barras na cor do slot 1 — o comprimento já
// codifica o valor; uma cor por barra re-codificaria a identidade à toa e
// quebraria a segurança para daltonismo ao ciclar tons além dos 8 slots.
function barBody(data, bars, narrow, theme, height, onDrill) {
  const single = bars.length === 1
  const tick = { fontSize: 12, fill: theme.tick }
  const pal = theme.palette
  const click = onDrill ? (d) => onDrill(d?.name ?? d?.payload?.name) : undefined
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 4 }} barCategoryGap={single ? '28%' : '22%'}>
        <BarGradients palette={pal} />
        <CartesianGrid horizontal={false} stroke={theme.grid} />
        <XAxis type="number" tickFormatter={fmtCompact} tick={tick} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={narrow ? 96 : 150} tick={tick} tickLine={false} axisLine={false} />
        <Tooltip content={tooltip} cursor={{ fill: theme.cursorFill }} />
        {!single && legend}
        {bars.map(({ key, name }, i) => (
          <Bar key={key} dataKey={key} name={name} fill={`url(#pf-bar-${i % pal.length})`}
            radius={[0, single ? 6 : 5, single ? 6 : 5, 0]} maxBarSize={single ? 34 : 20} onClick={click} {...ANIM}>
            <LabelList dataKey={key} position="right" formatter={fmtCompact} fill={theme.label}
              fontSize={single ? (narrow ? 11 : 12) : (narrow ? 9 : 11)} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function pieBody(data, theme, height, onDrill) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0)
  const colorAt = (d, i) => (d.other ? theme.tick : theme.palette[i % theme.palette.length])
  const click = onDrill ? (name) => onDrill(name) : undefined
  return (
    <div className="pie-wrap">
      <div className="pie-donut">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius="58%"
              paddingAngle={data.length > 1 ? 2 : 0} stroke={theme.surface} strokeWidth={2}
              onClick={click ? (d) => !d?.payload?.other && click(d?.name ?? d?.payload?.name) : undefined} {...ANIM}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorAt(d, i)} cursor={click && !d.other ? 'pointer' : 'default'} />
              ))}
              <Label content={pieCenterLabel(total, theme)} position="center" />
            </Pie>
            <Tooltip content={tooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="pie-legend">
        {data.map((d, i) => {
          const clickable = click && !d.other
          return (
            <li
              key={i} className={clickable ? 'clickable' : ''}
              {...(clickable
                ? {
                    role: 'button', tabIndex: 0,
                    'aria-label': `Filtrar por ${d.name}`,
                    onClick: () => click(d.name),
                    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(d.name) } },
                  }
                : {})}
            >
              <span className="pl-dot" style={{ background: colorAt(d, i) }} />
              <span className="pl-name" title={d.name}>{d.name}</span>
              <span className="pl-val">{fmtNum(d.value)}</span>
              <span className="pl-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Slug de arquivo a partir do título do gráfico.
const slug = (s) =>
  (s || 'grafico').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grafico'

// Menu de download (PNG/JPG) + botão de tela cheia, reaproveitado no card e no modal.
function Toolbar({ exportRef, title, onToggleFull, fullIcon }) {
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const dlRef = useRef(null)

  // Fecha o menu ao clicar fora dele (em vez de no mouseleave, que fechava no caminho).
  useEffect(() => {
    if (!menu) return
    const onDown = (e) => { if (dlRef.current && !dlRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  async function download(fmt) {
    setMenu(false)
    const node = exportRef.current
    if (!node) return
    setBusy(true)
    try {
      const lib = await import('html-to-image') // sob demanda (fora do bundle inicial)
      const bg = readVar('--surface', '#ffffff')
      const opt = {
        pixelRatio: 2, backgroundColor: bg, cacheBust: true,
        filter: (n) => !(n.classList && n.classList.contains('no-print')),
      }
      const url = fmt === 'jpg' ? await lib.toJpeg(node, { ...opt, quality: 0.95 }) : await lib.toPng(node, opt)
      const a = document.createElement('a')
      a.download = `${slug(title)}.${fmt}`
      a.href = url
      a.click()
    } catch (err) {
      console.error('Falha ao exportar gráfico:', err)
      alert('Não foi possível gerar a imagem deste gráfico. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chart-tools no-print">
      <div className="dl" ref={dlRef}>
        <button className="chart-tool" title="Baixar imagem" aria-label="Baixar imagem"
          aria-expanded={menu} disabled={busy} onClick={() => setMenu((v) => !v)}>
          {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
        </button>
        {menu && (
          <div className="dl-menu">
            <button onClick={() => download('png')}>Baixar PNG</button>
            <button onClick={() => download('jpg')}>Baixar JPG</button>
          </div>
        )}
      </div>
      <button className="chart-tool" title={fullIcon === 'close' ? 'Fechar' : 'Tela cheia'}
        aria-label={fullIcon === 'close' ? 'Fechar' : 'Tela cheia'} onClick={onToggleFull}>
        {fullIcon === 'close' ? <X size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  )
}

function ChartCard({ Icon, title, drillable, height, modalHeight, renderBody, plotLabel }) {
  const [full, setFull] = useState(false)
  const plotAria = plotLabel ? { role: 'img', 'aria-label': plotLabel } : {}
  const cardRef = useRef(null)
  const modalRef = useRef(null)
  const modalCardRef = useRef(null)

  useEffect(() => {
    if (!full) return
    const onKey = (e) => e.key === 'Escape' && setFull(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    modalCardRef.current?.focus() // acessibilidade: joga o foco para dentro do diálogo
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [full])

  return (
    <div className={`card chart-card${drillable ? ' drillable' : ''}`}>
      <Toolbar exportRef={cardRef} title={title} onToggleFull={() => setFull(true)} fullIcon="open" />
      <div className="chart-export" ref={cardRef}>
        <h3>
          {Icon && <Icon size={16} className="chart-ic" />}{title}
          {drillable && <span className="drill-hint no-print">clique para filtrar</span>}
        </h3>
        <div className="chart-body" {...plotAria}>{renderBody(height)}</div>
      </div>

      {full && (
        <div className="chart-modal no-print" role="dialog" aria-modal="true" aria-label={title} onClick={() => setFull(false)}>
          <div className="chart-modal-card" ref={modalCardRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <Toolbar exportRef={modalRef} title={title} onToggleFull={() => setFull(false)} fullIcon="close" />
            <div className="chart-export" ref={modalRef}>
              <h3>{Icon && <Icon size={16} className="chart-ic" />}{title}</h3>
              <div className="chart-body" {...plotAria}>{renderBody(modalHeight)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
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

export default function ChartWidget({ chart, onDrill }) {
  const narrow = useNarrow()
  const theme = useChartTheme()
  const Icon = HeaderIcon[chart.type]
  const title = chart.gran ? `${chart.title} · por ${GRAN_WORD[chart.gran]}` : chart.title

  const drillable = !!(onDrill && chart.dim && DRILLABLE.has(chart.type))
  const drill = drillable
    ? (name) => { if (name && name !== 'Outros') onDrill(chart.dim, name) }
    : undefined

  const empty = !chart.data || !chart.data.length
  const base = narrow ? 280 : 360
  let height = base
  if (chart.type === 'bar') height = Math.max(base, chart.data.length * 34 + 52)
  else if (chart.type === 'bars') height = Math.max(base, chart.data.length * 46 + 52)
  const modalHeight = Math.min(720, Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.72))

  const renderBody = (h) => {
    switch (chart.type) {
      case 'line':
        return areaBody(chart.data, chart.measure, narrow, theme, h)
      case 'lines':
        return lineBody(chart.data, chart.measures.map((m) => ({ key: m, name: m })), narrow, theme, h)
      case 'bar':
        return barBody(chart.data, [{ key: 'value', name: chart.measure }], narrow, theme, h, drill)
      case 'bars':
        return barBody(chart.data, chart.measures.map((m) => ({ key: m, name: m })), narrow, theme, h, drill)
      case 'pie':
        return pieBody(chart.data, theme, h, drill)
      default:
        return null
    }
  }

  if (empty) {
    return (
      <div className="card chart-card">
        <h3>{Icon && <Icon size={16} className="chart-ic" />}{title}</h3>
        <div className="empty-chart">Sem dados para exibir</div>
      </div>
    )
  }

  return (
    <ChartCard
      Icon={Icon} title={title} drillable={drillable} height={height} modalHeight={modalHeight}
      renderBody={renderBody} plotLabel={chart.type === 'pie' ? undefined : title}
    />
  )
}
