// Benchmark real do pipeline. Rode com:  npx vite-node benchmark/run.mjs
// Compara a abordagem ANTIGA (filtrar + agregar por gráfico, com re-parse de números
// a cada interação, na UI thread) com o ENGINE (colunar tipado + índices + computeView).
import { profileColumns, numOf } from '../src/lib/profile.js'
import { buildDashboard } from '../src/lib/suggestCharts.js'
import { groupAgg, groupAggMulti, timeSeries, timeSeriesMulti, pivot } from '../src/lib/aggregate.js'
import { buildEngine, computeView } from '../src/lib/engine.js'
import { keyOf } from '../src/lib/utils.js'

const money = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const conv = ['Unimed', 'Bradesco', 'Amil', 'SulAmérica', 'Hapvida', 'Particular']
const esp = ['Cardiologia', 'Ortopedia', 'Pediatria', 'Clínica', 'Gineco', 'Dermato', 'Neuro', 'Uro']
const uni = ['Matriz', 'Norte', 'Sul', 'Leste']

function genRows(n) {
  const rows = []
  for (let i = 0; i < n; i++) {
    const apres = 60 + (i % 1400)
    rows.push({
      'Competência': `${String(1 + (i % 27)).padStart(2, '0')}/${String(1 + (i % 12)).padStart(2, '0')}/2024`,
      'Convênio': conv[i % conv.length],
      'Especialidade': esp[i % esp.length],
      'Unidade': uni[i % uni.length],
      'Valor Apresentado': money(apres), // string BR => exige parse
      'Glosa': money(apres * 0.1),
      'Valor Pago': money(apres * 0.9),
      'Quantidade': 1 + (i % 8),
    })
  }
  return rows
}

const ms = (f) => { const t = performance.now(); f(); return performance.now() - t }
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const fmt = (x) => x.toFixed(1).padStart(8)

// Abordagem ANTIGA: uma interação de filtro = filtrar + KPIs + cada gráfico (re-parse).
function oldInteraction(rows, dash, kpiItems, filters) {
  const dimE = Object.entries(filters.dims || {}).filter(([, v]) => v && v.length)
  const filtered = dimE.length
    ? rows.filter((r) => dimE.every(([d, vals]) => vals.includes(keyOf(r[d]))))
    : rows
  for (const it of kpiItems) {
    if (it.agg === 'count') continue
    let s = 0, c = 0
    for (const r of filtered) { const v = numOf(r[it.measure]); if (v != null) { s += v; c++ } }
    void (it.agg === 'avg' ? (c ? s / c : 0) : s)
  }
  for (const w of dash.widgets) {
    if (w.type === 'bar') groupAgg(filtered, w.dim, w.measure)
    else if (w.type === 'bars') groupAggMulti(filtered, w.dim, w.measures)
    else if (w.type === 'pie') groupAgg(filtered, w.dim, w.measure)
    else if (w.type === 'line') timeSeries(filtered, w.dateCol, w.measure)
    else if (w.type === 'lines') timeSeriesMulti(filtered, w.dateCol, w.measures)
    else if (w.type === 'pivot') pivot(filtered, w.rowDim, w.colDim, w.measure)
  }
}

const sizes = [50000, 200000, 500000, 1000000]
console.log('\nPainelFácil — benchmark (ms; menor = melhor)\n')
console.log('linhas   | perfil+build | engine(1x) | ANTIGO/filtro | ENGINE/filtro | ganho')
console.log('---------|--------------|------------|---------------|---------------|------')

for (const n of sizes) {
  let rows
  try { rows = genRows(n) } catch { console.log(`${String(n).padStart(8)} | sem memória para gerar`); continue }
  const cols = Object.keys(rows[0]).map((name, index) => ({ index, name }))

  const tProfile = ms(() => { profileColumns(cols, rows) })
  const profiles = profileColumns(cols, rows)
  const dash = buildDashboard(profiles, rows)
  const kpiItems = dash.widgets.find((w) => w.type === 'kpis').items

  const tEngine = ms(() => { buildEngine({ data: rows }, profiles) })
  const engine = buildEngine({ data: rows }, profiles)

  const filters = { dims: { 'Convênio': ['Unimed', 'Amil'] } }
  const oldRuns = [0, 0, 0].map(() => ms(() => oldInteraction(rows, dash, kpiItems, filters)))
  const newRuns = [0, 0, 0].map(() => ms(() => computeView(engine, dash, filters, { sort: { col: 'Valor Apresentado', dir: -1 } })))
  const oldMed = median(oldRuns)
  const newMed = median(newRuns)

  console.log(
    `${String(n).padStart(8)} |${fmt(tProfile + tEngine)}     |${fmt(tEngine)}  |${fmt(oldMed)}      |${fmt(newMed)}      | ${(oldMed / newMed).toFixed(1)}x`,
  )
}
console.log('')
