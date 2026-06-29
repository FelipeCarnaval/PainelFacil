import { parseBRNumber } from './brFormat'

// Recebe a matriz crua de uma aba e descobre onde começa a tabela "de verdade":
// pula títulos/filtros no topo, identifica o cabeçalho e remove linhas de total.

const isEmpty = (v) => v == null || String(v).trim() === ''
const nonEmpty = (v) => !isEmpty(v)

function isNumericCell(v) {
  if (typeof v === 'number') return true
  if (v instanceof Date) return false
  return parseBRNumber(v) != null
}

function isTextCell(v) {
  return nonEmpty(v) && typeof v !== 'number' && !(v instanceof Date) && !isNumericCell(v)
}

const TOTAL_RX = /^(total|subtotal|totais|total\s+geral|soma|geral)\b/i

function isTotalRow(row) {
  const cells = row.filter(nonEmpty)
  if (cells.length === 0) return true
  for (const v of row) {
    if (typeof v === 'string' && TOTAL_RX.test(v.trim())) return true
  }
  return false
}

// Fase A — cabeçalho de MÚLTIPLAS linhas. Uma linha é "de grupo" (rótulo mesclado sobre
// sub-colunas, ex.: um "2024"/"2025" cobrindo "Apresentado/Glosa") quando tem ≥2 rótulos
// textuais, porém MENOS que a linha principal do cabeçalho (por isso é mesclada/esparsa).
// Títulos soltos no topo têm 1 célula, então não são confundidos com grupo.
function isGroupHeaderRow(row, headerFilled) {
  if (!row) return false
  const cells = row.filter(nonEmpty)
  if (cells.length < 2 || cells.length >= headerFilled) return false
  // Rótulos curtos (anos, "Apresentado"…). O limite de 40 evita pegar subtítulos longos
  // do tipo "Período: 01/01 a 30/06 | Unidade: Todas" (que, de todo modo, têm 1 célula).
  return cells.every((v) => String(v).trim().length <= 40)
}

// Junta os níveis [start..end] em um nome por coluna. Nos níveis de GRUPO (acima da linha
// principal) o rótulo é propagado à direita ("carry-forward"), simulando a célula mesclada;
// a linha principal (sub-rótulos) não propaga. Ex.: "2024 · Apresentado".
function buildColumns(rows, start, end, maxLen) {
  const layers = []
  for (let r = start; r <= end; r++) {
    const row = rows[r] || []
    const layer = new Array(maxLen)
    let last = ''
    for (let c = 0; c < maxLen; c++) {
      const cell = nonEmpty(row[c]) ? String(row[c]).trim() : ''
      if (r < end) {
        if (cell) last = cell
        layer[c] = last
      } else {
        layer[c] = cell
      }
    }
    layers.push(layer)
  }

  const columns = []
  const seen = {}
  for (let c = 0; c < maxLen; c++) {
    const parts = []
    for (const layer of layers) {
      const p = layer[c]
      if (p && !parts.includes(p)) parts.push(p)
    }
    let name = parts.join(' · ')
    if (!name) name = `Coluna ${c + 1}`
    if (seen[name] != null) {
      seen[name] += 1
      name = `${name} (${seen[name]})`
    } else {
      seen[name] = 0
    }
    columns.push({ index: c, name })
  }
  return columns
}

// forcedHeaderRow (opcional): índice da linha de cabeçalho escolhido manualmente
// (correção da Fase G). Quando válido, pula a heurística de detecção.
export function detectTable(rows, forcedHeaderRow = null) {
  const empty = { headerRow: -1, columns: [], data: [], droppedTop: 0, droppedTotals: 0, headerRows: 0 }
  if (!rows || rows.length === 0) return empty

  const filled = rows.map((r) => r.filter(nonEmpty).length)
  // Evita Math.max(...array): espalhar centenas de milhares de itens estoura a pilha.
  const width = filled.reduce((m, n) => (n > m ? n : m), 0)
  const maxLen = rows.reduce((m, r) => (r.length > m ? r.length : m), 0)
  if (width === 0) return empty

  const forced = Number.isInteger(forcedHeaderRow) && forcedHeaderRow >= 0 && forcedHeaderRow < rows.length
  let headerIdx = -1
  if (forced) {
    headerIdx = forcedHeaderRow // cabeçalho definido manualmente
  } else {
    // Procura a linha de cabeçalho entre as 30 primeiras.
    const limit = Math.min(rows.length, 30)
    for (let i = 0; i < limit; i++) {
      const r = rows[i]
      if (filled[i] < Math.max(2, width * 0.6)) continue
      const cells = r.filter(nonEmpty)
      const textFrac = cells.filter(isTextCell).length / cells.length
      const nextFilled = i + 1 < rows.length ? filled[i + 1] : 0
      if (textFrac >= 0.5 && nextFilled >= Math.max(2, width * 0.5)) {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) headerIdx = filled.indexOf(width) // fallback: linha mais "cheia"
  }

  // Cabeçalho real é a linha headerIdx; busca níveis de GRUPO logo acima (mesclados) para
  // montar nomes combinados. Quando forçado manualmente, vale exatamente a linha escolhida.
  let headerStart = headerIdx
  if (!forced) {
    const headerFilled = filled[headerIdx]
    for (let g = headerIdx - 1; g >= 0 && isGroupHeaderRow(rows[g], headerFilled); g--) {
      headerStart = g
    }
  }

  // Monta nomes de colunas mesclando os níveis do cabeçalho (evita vazios e duplicados).
  const columns = buildColumns(rows, headerStart, headerIdx, maxLen)

  // Linhas de dados (remove vazias e totais).
  const data = []
  let droppedTotals = 0
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.filter(nonEmpty).length === 0) continue
    if (isTotalRow(r)) {
      droppedTotals += 1
      continue
    }
    const obj = {}
    for (const col of columns) obj[col.name] = r[col.index] ?? null
    data.push(obj)
  }

  return {
    headerRow: headerIdx,
    columns,
    data,
    droppedTop: headerStart,
    droppedTotals,
    headerRows: headerIdx - headerStart + 1,
  }
}
