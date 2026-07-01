import { analyzeDataset } from '../lib/analysis'
import { buildEngine, computeView, viewSignature } from '../lib/engine'

// xlsx (~400 KB) é pesado e só é necessário na UI thread no FALLBACK síncrono (sem Worker).
// Importamos sob demanda para mantê-lo FORA do bundle principal — o caminho normal lê o
// arquivo dentro do Worker, que tem o seu próprio chunk.
const loadParseFile = () => import('../lib/parseFile')

// Fachada entre a UI e o Web Worker. Esconde postMessage/onmessage, faz cache de
// visões e cai para execução SÍNCRONA se Workers não existirem (browser antigo / teste).

let worker = null
let workerState = 'untried' // 'untried' | 'ok' | 'failed'
let nextId = 1
let nextToken = 1
const pending = new Map()
const syncStore = new Map() // token -> sheets (fallback)
const metaCache = new Map() // analysisKey -> meta
const engineCache = new Map() // analysisKey -> { engine, dash } (fallback síncrono)
const viewCache = new Map() // analysisKey|assinatura -> view (limite LRU)
const VIEW_CACHE_MAX = 40

function ensureWorker() {
  if (workerState !== 'untried') return
  try {
    worker = new Worker(new URL('../lib/workers/analysis.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const { id, ok, payload, error } = e.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      ok ? p.resolve(payload) : p.reject(new Error(error))
    }
    // Erro fatal no worker: não deixe a UI pendurada — rejeita o que estava pendente
    // e marca o worker como inutilizável para os próximos pedidos caírem no modo síncrono.
    worker.onerror = (e) => {
      workerState = 'failed'
      worker = null
      const msg = e?.message || 'Falha no processamento em segundo plano.'
      for (const [, p] of pending) p.reject(new Error(msg))
      pending.clear()
    }
    workerState = 'ok'
  } catch {
    workerState = 'failed'
  }
}

function send(type, data, transfer) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, type, ...data }, transfer || [])
  })
}
const usingWorker = () => workerState === 'ok' && !!worker
const keyOf = (token, sheetIndex, overrides) => `${token}|${sheetIndex}|${JSON.stringify(overrides)}`

function lruSet(map, key, val, max) {
  if (map.has(key)) map.delete(key)
  map.set(key, val)
  if (map.size > max) map.delete(map.keys().next().value)
}

// Constrói a META (mesma forma do worker) na thread atual e guarda o engine p/ visões.
function analyzeSyncToMeta(token, sheetIndex, overrides) {
  const sheets = syncStore.get(token)
  if (!sheets) throw new Error('Conjunto de dados não encontrado.')
  const res = analyzeDataset(sheets[sheetIndex].rows, overrides)
  const engine = buildEngine(res.table, res.profiles)
  engineCache.set(keyOf(token, sheetIndex, overrides), { engine, dash: res.dash })
  const dimOptions = {}
  for (const d of res.dash.dims) if (engine.dimOptions[d]) dimOptions[d] = engine.dimOptions[d]
  return {
    headerRow: res.table.headerRow, headerRows: res.table.headerRows,
    droppedTop: res.table.droppedTop, droppedTotals: res.table.droppedTotals,
    rowCount: res.table.data.length, allProfiles: res.allProfiles, profiles: res.profiles,
    dash: res.dash, preview: res.preview, crosstab: res.crosstab, dimOptions, analyzeMs: 0,
  }
}

export async function parseFile(file) {
  const buffer = await file.arrayBuffer()
  const csv = /\.csv$/i.test(file.name || '') || file.type === 'text/csv'
  const token = 'ds' + nextToken++
  ensureWorker()
  if (usingWorker()) {
    const { sheets } = await send('parse', { token, buffer, csv }, [buffer])
    return { token, sheets }
  }
  const { readWorkbookBuffer } = await loadParseFile()
  const sheets = readWorkbookBuffer(buffer, csv)
  syncStore.set(token, sheets)
  return { token, sheets: sheets.map((s) => ({ name: s.name, rowCount: s.rows.length })) }
}

export async function loadRows(rows) {
  const token = 'ds' + nextToken++
  ensureWorker()
  if (usingWorker()) {
    const { sheets } = await send('loadRows', { token, rows })
    return { token, sheets }
  }
  syncStore.set(token, [{ name: 'dados', rows }])
  return { token, sheets: [{ name: 'dados', rowCount: rows.length }] }
}

/** Analisa uma aba (parse já feito). Memoizado por token+aba+overrides. */
export async function analyze(token, sheetIndex, overrides = {}) {
  const key = keyOf(token, sheetIndex, overrides)
  if (metaCache.has(key)) return metaCache.get(key)
  const meta = usingWorker()
    ? await send('analyze', { token, sheetIndex, overrides })
    : analyzeSyncToMeta(token, sheetIndex, overrides)
  metaCache.set(key, meta)
  return meta
}

/** Calcula a visão (filtros + tabela). Memoizada por (análise + assinatura dos filtros). */
export async function view(token, sheetIndex, overrides, filters = {}, tableState = {}, opts = {}) {
  const key = keyOf(token, sheetIndex, overrides)
  const sig = key + '||' + viewSignature(filters, tableState, opts)
  if (viewCache.has(sig)) return { ...viewCache.get(sig), cached: true }

  let payload
  if (usingWorker()) {
    payload = await send('view', { key, filters, tableState, opts })
    if (payload && payload.needAnalyze) {
      await analyze(token, sheetIndex, overrides) // reconstrói o engine no worker
      payload = await send('view', { key, filters, tableState, opts })
    }
  } else {
    let eng = engineCache.get(key)
    if (!eng) { analyzeSyncToMeta(token, sheetIndex, overrides); eng = engineCache.get(key) }
    payload = computeView(eng.engine, eng.dash, filters, tableState, opts)
  }
  lruSet(viewCache, sig, payload, VIEW_CACHE_MAX)
  return payload
}

/** Todas as linhas filtradas+ordenadas (para exportar Excel). */
export async function exportRows(token, sheetIndex, overrides, filters = {}, tableState = {}) {
  const big = { ...tableState, page: 0, pageSize: Number.MAX_SAFE_INTEGER }
  const v = await view(token, sheetIndex, overrides, filters, big)
  return v.table.rows
}

export function release(token) {
  if (!token) return
  syncStore.delete(token)
  for (const m of [metaCache, engineCache]) for (const k of m.keys()) if (k.startsWith(token + '|')) m.delete(k)
  for (const k of viewCache.keys()) if (k.startsWith(token + '|')) viewCache.delete(k)
  if (usingWorker()) send('release', { token }).catch(() => {})
}
