import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  ReferenceLine, ReferenceDot,
} from 'recharts'
import { LineChart as LineIcon, BarChart3, ListOrdered, PieChart as ShareIcon, Maximize2, X, Download, Loader2 } from 'lucide-react'
import { fmtCompact, fmtNum, fmtMoney, fmtMoneyCompact, isMoneyName, GRAN_WORD } from '../lib/brFormat'
import ChartTooltip from './ChartTooltip'
import HelpHint from './HelpHint'

// Paletas categóricas CORPORATIVAS e VALIDADAS (colorblind-safe): 8 tons sóbrios
// (azul-marinho, dourado, petróleo, vinho…) em ORDEM FIXA — a ordem é o mecanismo
// de segurança para daltonismo e nunca muda nem cicla. Validação (script
// Machado-2009): claro vs #ffffff → TODOS os checks passam (pior par adjacente
// ΔE 31,5 protan); escuro vs #16182a → TODOS passam (pior par ΔE 17,5 deutan).
// Séries ÚNICAS (sem identidade por cor) usam o azul da marca — ver brand1/2.
const PALETTE_LIGHT = [
  '#1d4ed8', '#a16207', '#0d9488', '#9f1239',
  '#0369a1', '#15803d', '#6d28d9', '#c2410c',
]
const PALETTE_DARK = [
  '#5b8def', '#bd8b16', '#1fa898', '#e0567e',
  '#3395cf', '#3fae62', '#9a70f0', '#e0703d',
]

// Legenda embaixo, centralizada (padrão dos dashboards da empresa).
// Clicável: liga/desliga cada série (a escondida fica riscada/apagada).
const legendBottom = (hidden, onToggle) => (
  <Legend
    iconType="circle" iconSize={11} verticalAlign="bottom" align="center"
    wrapperStyle={{ fontSize: 12, paddingTop: 10, cursor: 'pointer', userSelect: 'none' }}
    onClick={(e) => onToggle(e?.value)}
    formatter={(value) => (
      <span style={{ textDecoration: hidden.has(value) ? 'line-through' : 'none', opacity: hidden.has(value) ? 0.5 : 1 }}>
        {value}
      </span>
    )}
  />
)
const ANIM = { isAnimationActive: true, animationDuration: 750, animationEasing: 'ease-out', animationBegin: 0 }
// Ícone + gradiente do cabeçalho por papel do gráfico (evolução, ranking, participação…).
const HEADER = {
  line: { Icon: LineIcon, grad: 'blue' },
  lines: { Icon: LineIcon, grad: 'blue' },
  bar: { Icon: ListOrdered, grad: 'teal' },
  bars: { Icon: BarChart3, grad: 'slate' },
  dist: { Icon: ShareIcon, grad: 'gold' },
}
const DRILLABLE = new Set(['bar', 'bars', 'dist'])
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s))

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
    // Azul corporativo da marca para marcas de série única —
    // contraste vs superfície ≥ 3,8:1 nos dois temas.
    brand1: readVar('--c-blue-1', dark ? '#3b82f6' : '#1e3a8a'),
    brand2: readVar('--c-blue-2', dark ? '#60a5fa' : '#2563eb'),
    grid: readVar('--grid-line', dark ? '#283146' : '#eef2f7'),
    axis: dark ? 'rgba(255,255,255,0.14)' : '#e2e8f0',
    tick: readVar('--text-dim', '#64748b'),
    label: readVar('--text', '#334155'),
    surface: readVar('--surface-solid', dark ? '#16182a' : '#ffffff'),
    borderStrong: readVar('--border-strong', '#cbd5e1'),
    cursorFill: dark ? 'rgba(96,165,250,0.10)' : 'rgba(37,99,235,0.06)',
    track: dark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.05)',
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

// Gradientes verticais (topo cheio → base translúcida) para as colunas.
function BarGradients({ palette }) {
  return (
    <defs>
      {palette.map((c, i) => (
        <linearGradient key={i} id={`pf-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={1} />
          <stop offset="100%" stopColor={c} stopOpacity={0.55} />
        </linearGradient>
      ))}
    </defs>
  )
}

// Gradiente da marca (roxo → violeta) para colunas de série única.
function BrandBarGradient({ theme }) {
  return (
    <defs>
      <linearGradient id="pf-brand-bar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={theme.brand2} stopOpacity={1} />
        <stop offset="100%" stopColor={theme.brand1} stopOpacity={0.6} />
      </linearGradient>
    </defs>
  )
}

// Rótulo de valor em "pill" escura no topo da coluna — assinatura visual dos
// dashboards da empresa (texto branco sobre rgba(0,0,0,.5), cantos arredondados).
// `stagger` alterna a altura das pills (par/ímpar) para não colidirem em
// gráficos com muitas colunas.
const pillLabel = (fmt, fontSize = 10, stagger = false) =>
  function Pill({ x, y, width, value, index }) {
    if (value == null || !(value > 0)) return null
    const text = fmt(value)
    const w = Math.round(text.length * fontSize * 0.62) + 10
    const cx = x + width / 2
    const lift = stagger && index % 2 === 1 ? 17 : 0
    return (
      <g pointerEvents="none">
        <rect x={cx - w / 2} y={y - 20 - lift} rx={4} width={w} height={16} fill="rgba(15, 23, 42, 0.55)" />
        <text x={cx} y={y - 8.5 - lift} textAnchor="middle" fill="#ffffff" fontSize={fontSize} fontWeight={600}>
          {text}
        </text>
      </g>
    )
  }

// Rotaciona os rótulos do eixo X quando os nomes são longos ou há muitas colunas.
const xAxisCat = (data, theme, narrow) => {
  const longest = data.reduce((a, d) => Math.max(a, String(d.name || '').length), 0)
  const rotate = data.length > 6 || longest > 9 || narrow
  return {
    dataKey: 'name',
    interval: 0,
    tick: { fontSize: data.length > 14 ? 10 : 11, fill: theme.tick },
    tickFormatter: (v) => trunc(v, narrow ? 10 : 14),
    tickLine: false,
    axisLine: { stroke: theme.axis, strokeWidth: 2 },
    ...(rotate ? { angle: -30, textAnchor: 'end', height: 64 } : { tickMargin: 8 }),
  }
}

const lastValueLabel = (count, fill, fontSize, fmt = fmtCompact, dy = 0) =>
  function LastValue({ x, y, value, index }) {
    if (index !== count - 1 || value == null) return null
    return (
      <text x={x + 10} y={y + dy} dy={4} fill={fill} fontSize={fontSize} fontWeight={700} textAnchor="start">
        {fmt(value)}
      </text>
    )
  }

// Deslocamento vertical dos rótulos de ponta para não colidirem quando as
// séries terminam próximas: ordena pela posição estimada e garante 14px entre eles.
function endLabelOffsets(data, lines, hidden, height) {
  const offsets = {}
  if (!data.length) return offsets
  const last = data[data.length - 1]
  let globalMax = 0
  for (const d of data) for (const { key } of lines) globalMax = Math.max(globalMax, d[key] || 0)
  const plotH = Math.max(height - 70, 100)
  const entries = lines
    .filter(({ name }) => !hidden.has(name))
    .map(({ key }) => ({ key, y: (1 - (last[key] || 0) / (globalMax || 1)) * plotH }))
    .sort((a, b) => a.y - b.y)
  let prev = -Infinity
  for (const e of entries) {
    const y = Math.max(e.y, prev + 14)
    offsets[e.key] = y - e.y
    prev = y
  }
  return offsets
}

// --- Evolução (série única): área com gradiente, média, pico e ponto final. ---

function areaBody(data, name, narrow, theme, height, money) {
  const tick = { fontSize: 11.5, fill: theme.tick }
  const c = theme.brand1
  const fmt = money ? fmtMoneyCompact : fmtCompact
  const avg = data.reduce((a, d) => a + (d.value || 0), 0) / (data.length || 1)
  const last = data[data.length - 1]
  // Poucos pontos: valor visível em cima de cada um (padrão dos dashboards da
  // empresa). Muitos pontos: só média, pico e último valor (o tooltip detalha).
  const showPointLabels = data.length <= 16 && !narrow
  // Pico destacado (quando não é o último ponto, que já tem rótulo próprio).
  let peak = null
  if (data.length >= 4 && !showPointLabels) {
    peak = data.reduce((p, d) => (d.value > p.value ? d : p), data[0])
    if (peak === last || !(peak.value > 0)) peak = null
  }
  // Variação vs. ponto anterior, para o tooltip.
  const prevOf = (label) => {
    const i = data.findIndex((d) => d.name === label)
    return i > 0 ? data[i - 1].value : null
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 24, right: showPointLabels ? 24 : money ? 88 : 68, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.38} />
            <stop offset="94%" stopColor={theme.brand2} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis
          dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }}
          minTickGap={28} tickMargin={8}
          padding={showPointLabels ? { left: 28, right: 28 } : undefined}
        />
        <YAxis tickFormatter={fmt} tick={tick} tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }} width={money ? 74 : 52} />
        <Tooltip content={<ChartTooltip money={money} prevOf={prevOf} />} cursor={{ stroke: theme.brand1, strokeWidth: 1, strokeDasharray: '4 4' }} />
        {data.length >= 3 && (
          <ReferenceLine
            y={avg} stroke={theme.borderStrong} strokeDasharray="4 4"
            label={{ value: `média ${fmt(avg)}`, position: 'insideBottomLeft', fill: theme.tick, fontSize: 10.5 }}
          />
        )}
        <Area
          type="monotone" dataKey="value" name={name} stroke={c} strokeWidth={3}
          fill="url(#pf-area)"
          dot={data.length <= 40 ? { r: 3, strokeWidth: 2, stroke: c, fill: theme.surface } : false}
          activeDot={{ r: 5.5 }} {...ANIM}
        >
          {showPointLabels ? (
            <LabelList dataKey="value" position="top" offset={9} formatter={fmtCompact}
              fill={theme.label} fontSize={10.5} fontWeight={700} />
          ) : (
            <LabelList dataKey="value" content={lastValueLabel(data.length, theme.label, narrow ? 11 : 12.5, fmt)} />
          )}
        </Area>
        {peak && (
          <ReferenceDot
            x={peak.name} y={peak.value} r={4} fill={theme.surface} stroke={c} strokeWidth={2}
            label={{ value: `pico ${fmt(peak.value)}`, position: 'top', fill: theme.tick, fontSize: 10.5, fontWeight: 700 }}
          />
        )}
        {last && <ReferenceDot x={last.name} y={last.value} r={4.5} fill={c} stroke={theme.surface} strokeWidth={2} />}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// --- Evolução comparada (multi-série, legenda liga/desliga). ---
// Sem rótulo de valor na ponta: com séries próximas eles colidem — a legenda
// nomeia e o tooltip (com % vs. medida principal) detalha.

function lineBody(data, lines, narrow, theme, height, money, hidden, onToggle) {
  const tick = { fontSize: 11.5, fill: theme.tick }
  const fmt = money ? fmtMoneyCompact : fmtCompact
  const showDots = data.length <= 40
  // Poucos pontos: valor em cima de cada ponto, na cor da série. Muitos pontos:
  // valor na ponta de cada linha, com anti-colisão quando as séries convergem.
  const showPointLabels = data.length <= 16 && !narrow
  const offsets = showPointLabels ? {} : endLabelOffsets(data, lines, hidden, height)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 22, right: showPointLabels ? 24 : money ? 88 : 68, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis
          dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }}
          minTickGap={28} tickMargin={8}
          padding={showPointLabels ? { left: 28, right: 28 } : undefined}
        />
        <YAxis tickFormatter={fmt} tick={tick} tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }} width={money ? 74 : 52} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ stroke: theme.brand1, strokeWidth: 1, strokeDasharray: '4 4' }} />
        {legendBottom(hidden, onToggle)}
        {lines.map(({ key, name }, i) => {
          const c = theme.palette[i % theme.palette.length]
          return (
            <Line
              key={key} type="monotone" dataKey={key} name={name} stroke={c} strokeWidth={3}
              hide={hidden.has(name)}
              dot={showDots ? { r: 2.6, strokeWidth: 1.8, stroke: c, fill: theme.surface } : false}
              activeDot={{ r: 5 }} {...ANIM}
            >
              {showPointLabels ? (
                <LabelList dataKey={key} position="top" offset={9} formatter={fmtCompact}
                  fill={c} fontSize={10} fontWeight={700} />
              ) : (
                <LabelList dataKey={key} content={lastValueLabel(data.length, theme.label, narrow ? 10 : 11.5, fmt, offsets[key] || 0)} />
              )}
            </Line>
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- Ranking: colunas verticais (maior → menor) com pill de valor no topo. ---

function rankBody(data, measure, narrow, theme, height, onDrill, money) {
  const click = onDrill ? (d) => onDrill(d?.name ?? d?.payload?.name) : undefined
  const fmt = money ? fmtMoneyCompact : fmtCompact
  const total = data.reduce((a, d) => a + (d.value || 0), 0)
  const showPills = data.length <= 25 && !narrow
  const stagger = data.length > 8 // colunas estreitas: alterna a altura das pills
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: showPills ? (stagger ? 44 : 28) : 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="28%">
        <BrandBarGradient theme={theme} />
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis {...xAxisCat(data, theme, narrow)} />
        <YAxis
          type="number" tickFormatter={fmt} tick={{ fontSize: 11.5, fill: theme.tick }}
          tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }} width={money ? 74 : 52}
        />
        <Tooltip content={<ChartTooltip money={money} total={total} />} cursor={{ fill: theme.cursorFill }} />
        <Bar
          dataKey="value" name={measure} fill="url(#pf-brand-bar)" radius={[6, 6, 0, 0]}
          maxBarSize={46} onClick={click} {...ANIM}
        >
          {showPills && <LabelList dataKey="value" content={pillLabel(fmt, 10, stagger)} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- Comparativo multi-medida: colunas agrupadas, legenda embaixo. ---

function groupedBarBody(data, bars, narrow, theme, height, onDrill, money, hidden, onToggle) {
  const click = onDrill ? (d) => onDrill(d?.name ?? d?.payload?.name) : undefined
  const fmt = money ? fmtMoneyCompact : fmtCompact
  // Pills quando o total de colunas dá espaço (alturas diferentes evitam colisão
  // dentro do grupo; entre grupos o espaçamento resolve).
  const visible = bars.filter(({ name }) => !hidden.has(name)).length
  const showPills = !narrow && data.length * Math.max(visible, 1) <= 30
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: showPills ? 26 : 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="24%" barGap={3}>
        <BarGradients palette={theme.palette} />
        <CartesianGrid vertical={false} stroke={theme.grid} />
        <XAxis {...xAxisCat(data, theme, narrow)} />
        <YAxis
          type="number" tickFormatter={fmt} tick={{ fontSize: 11.5, fill: theme.tick }}
          tickLine={false} axisLine={{ stroke: theme.axis, strokeWidth: 2 }} width={money ? 74 : 52}
        />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: theme.cursorFill }} />
        {legendBottom(hidden, onToggle)}
        {bars.map(({ key, name }, i) => (
          <Bar key={key} dataKey={key} name={name} fill={`url(#pf-bar-${i % theme.palette.length})`}
            hide={hidden.has(name)} radius={[6, 6, 0, 0]} maxBarSize={30} onClick={click} {...ANIM}>
            {showPills && <LabelList dataKey={key} content={pillLabel(fmt, 9.5)} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- Participação no total: lista de barras de proporção (substitui a rosca). ---
// A identidade fica no rótulo da linha e a magnitude no comprimento + % — legível
// para qualquer visão de cor, e cada linha filtra o painel ao clicar.

const fmtPct = (p) => `${p.toFixed(p < 10 ? 1 : 0).replace('.', ',')}%`

function ShareList({ data, onDrill, money }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0)
  const fmt = money ? fmtMoney : (v) => fmtNum(v)
  return (
    <ul className="dist-list">
      {data.map((d) => {
        const pct = total ? (d.value / total) * 100 : 0
        const clickable = !!onDrill && !d.other
        return (
          <li
            key={d.name}
            className={`dist-item${clickable ? ' clickable' : ''}${d.other ? ' other' : ''}`}
            {...(clickable
              ? {
                  role: 'button', tabIndex: 0,
                  'aria-label': `Filtrar por ${d.name}`,
                  onClick: () => onDrill(d.name),
                  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrill(d.name) } },
                }
              : {})}
          >
            <div className="dist-row">
              <span className="dist-name" title={d.name}>{d.name}</span>
              <span className="dist-val">{fmt(d.value)}<em>{fmtPct(pct)}</em></span>
            </div>
            <div className="dist-track">
              <div className="dist-fill" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
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
      const bg = readVar('--surface-solid', '#ffffff')
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

// Cabeçalho de painel no padrão do design system: ícone em tile gradiente,
// título e subtítulo de contexto.
function PanelHeader({ Icon, grad, title, subtitle }) {
  return (
    <div className="panel-header">
      <span className="panel-icon" style={{ '--panel-grad': `var(--grad-${grad})` }} aria-hidden="true">
        {Icon && <Icon size={17} strokeWidth={2.2} />}
      </span>
      <div className="panel-heading">
        <h3 className="panel-title">{title}</h3>
        {subtitle && <p className="panel-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

function ChartCard({ Icon, grad, title, subtitle, drillable, wide, height, modalHeight, renderBody, plotLabel }) {
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
    <div className={`card chart-card${drillable ? ' drillable' : ''}${wide ? ' wide' : ''}`}>
      <Toolbar exportRef={cardRef} title={title} onToggleFull={() => setFull(true)} fullIcon="open" />
      <div className="chart-export" ref={cardRef}>
        <PanelHeader Icon={Icon} grad={grad} title={title} subtitle={subtitle} />
        <div className="chart-body" {...plotAria}>{renderBody(height)}</div>
      </div>

      {full && (
        <div className="chart-modal no-print" role="dialog" aria-modal="true" aria-label={title} onClick={() => setFull(false)}>
          <div className="chart-modal-card" ref={modalCardRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <Toolbar exportRef={modalRef} title={title} onToggleFull={() => setFull(false)} fullIcon="close" />
            <div className="chart-export" ref={modalRef}>
              <PanelHeader Icon={Icon} grad={grad} title={title} subtitle={subtitle} />
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
  const { Icon, grad } = HEADER[chart.type] || {}

  // Medida em R$? Liga "R$" em eixos, rótulos, tooltip e lista de participação.
  const money = isMoneyName(chart.measure) || (chart.measures || []).some(isMoneyName)

  // Séries escondidas pela legenda (clique liga/desliga).
  const [hidden, setHidden] = useState(() => new Set())
  const toggleSeries = (name) => {
    if (!name) return
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const drillable = !!(onDrill && chart.dim && DRILLABLE.has(chart.type))
  const drill = drillable
    ? (name) => { if (name && name !== 'Outros') onDrill(chart.dim, name) }
    : undefined

  // Contexto no subtítulo (em vez de poluir o título): período, medida e dica de filtro.
  const subtitle = (() => {
    const parts = []
    if (chart.gran) parts.push(`soma por ${GRAN_WORD[chart.gran]}`)
    if (chart.type === 'dist') parts.push('participação no total')
    if (chart.type === 'lines' || chart.type === 'bars') parts.push('clique na legenda para ocultar séries')
    if (drillable && chart.type !== 'lines' && chart.type !== 'bars') parts.push('clique para filtrar')
    return parts.join(' · ') || null
  })()

  const empty = !chart.data || !chart.data.length
  // Evolução ocupa a linha inteira; colunas com muitas categorias também.
  const wide =
    chart.type === 'line' || chart.type === 'lines' ||
    (chart.type === 'bar' && !empty && chart.data.length > 6) ||
    (chart.type === 'bars' && !empty && chart.data.length > 4)

  let height = narrow ? 260 : 330
  if (chart.type === 'bar') height = narrow ? 300 : 360
  else if (chart.type === 'bars') height = narrow ? 320 : 380
  const modalHeight = Math.min(720, Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.72))

  const renderBody = (h) => {
    switch (chart.type) {
      case 'line':
        return areaBody(chart.data, chart.measure, narrow, theme, h, money)
      case 'lines':
        return lineBody(chart.data, chart.measures.map((m) => ({ key: m, name: m })), narrow, theme, h, money, hidden, toggleSeries)
      case 'bar':
        return rankBody(chart.data, chart.measure, narrow, theme, h, drill, money)
      case 'bars':
        return groupedBarBody(chart.data, chart.measures.map((m) => ({ key: m, name: m })), narrow, theme, h, drill, money, hidden, toggleSeries)
      case 'dist':
        return <ShareList data={chart.data} onDrill={drill} money={money} />
      default:
        return null
    }
  }

  if (empty) {
    return (
      <div className="card chart-card">
        <PanelHeader Icon={Icon} grad={grad} title={chart.title} />
        <div className="empty-chart">Sem dados para exibir</div>
      </div>
    )
  }

  return (
    <ChartCard
      Icon={Icon} grad={grad} title={chart.title} subtitle={subtitle} drillable={drillable}
      wide={wide} height={height} modalHeight={modalHeight}
      renderBody={renderBody} plotLabel={chart.type === 'dist' ? undefined : chart.title}
    />
  )
}
