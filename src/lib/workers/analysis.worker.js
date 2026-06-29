// Web Worker: faz o trabalho pesado FORA da UI thread.
//  - parse do Excel/CSV
//  - análise (detecção + perfilamento + montagem do painel)
//  - constrói o ENGINE colunar tipado (mantido em memória)
//  - serve VISÕES (filtros + agregações + KPIs + página da tabela) sob demanda
// Devolve apenas resultados pequenos. A UI só renderiza.
import { readWorkbookBuffer } from '../parseFile'
import { analyzeDataset } from '../analysis'
import { buildEngine, computeView } from '../engine'

const store = new Map() // token -> [{ name, rows }]
let current = null // { key, engine, dash } — engine da última análise

const reply = (id, payload) => self.postMessage({ id, ok: true, payload })
const fail = (id, error) => self.postMessage({ id, ok: false, error: String(error) })
const meta = (sheets) => sheets.map((s) => ({ name: s.name, rowCount: s.rows.length }))
const now = () => performance.now()

function runAnalyze(token, sheetIndex, overrides) {
  const sheets = store.get(token)
  if (!sheets) throw new Error('Conjunto de dados não encontrado (token expirado).')
  const t0 = now()
  const res = analyzeDataset(sheets[sheetIndex].rows, overrides)
  const engine = buildEngine(res.table, res.profiles)
  current = { key: `${token}|${sheetIndex}|${JSON.stringify(overrides)}`, engine, dash: res.dash }
  const dimOptions = {}
  for (const d of res.dash.dims) if (engine.dimOptions[d]) dimOptions[d] = engine.dimOptions[d]
  return {
    headerRow: res.table.headerRow,
    headerRows: res.table.headerRows,
    droppedTop: res.table.droppedTop,
    droppedTotals: res.table.droppedTotals,
    rowCount: res.table.data.length,
    allProfiles: res.allProfiles,
    profiles: res.profiles,
    dash: res.dash,
    preview: res.preview,
    crosstab: res.crosstab,
    dimOptions,
    analyzeMs: Math.round((now() - t0) * 10) / 10,
  }
}

self.onmessage = (e) => {
  const { id, type } = e.data
  try {
    if (type === 'parse') {
      const sheets = readWorkbookBuffer(e.data.buffer, e.data.csv)
      store.set(e.data.token, sheets)
      reply(id, { sheets: meta(sheets) })
    } else if (type === 'loadRows') {
      const sheets = [{ name: 'dados', rows: e.data.rows }]
      store.set(e.data.token, sheets)
      reply(id, { sheets: meta(sheets) })
    } else if (type === 'analyze') {
      reply(id, runAnalyze(e.data.token, e.data.sheetIndex, e.data.overrides))
    } else if (type === 'view') {
      if (!current || current.key !== e.data.key) return reply(id, { needAnalyze: true })
      reply(id, computeView(current.engine, current.dash, e.data.filters, e.data.tableState))
    } else if (type === 'release') {
      store.delete(e.data.token)
      if (current && current.key.startsWith(e.data.token + '|')) current = null
      reply(id, {})
    } else {
      fail(id, 'Mensagem desconhecida: ' + type)
    }
  } catch (err) {
    fail(id, err?.message || err)
  }
}
