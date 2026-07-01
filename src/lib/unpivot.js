import { parseBRNumber } from './brFormat'

// ============================================================================
// Fase B — "desempilhar" tabelas CRUZADAS (cross-tab / pivot já montado).
// Caso típico (Soul MV): meses nas COLUNAS, setores nas LINHAS:
//
//   Setor            | jan/2025 | fev/2025 | ... | dez/2025
//   Pronto Socorro   |   1234   |   1310   | ... |   1402
//
// Sem tratamento, cada mês vira uma MEDIDA separada e não há eixo de tempo. Aqui
// detectamos esse formato e transformamos em uma tabela "longa" (uma linha por
// setor × mês), criando uma coluna de DATA e uma de VALOR — aí o painel monta a
// série temporal, o ranking e a distribuição corretamente.
// ============================================================================

const MESES = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6,
  agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
}

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Tenta interpretar o NOME de uma coluna como um período de tempo. Cobre os formatos
 * que aparecem nos relatórios (Benner/MV/Excel): "jan/2025", "janeiro-2025", "jan 25",
 * "01/2025", "2025-01", "T1/2025", "2025". Devolve a Date do início do período ou null.
 */
export function parsePeriodHeader(header) {
  if (header == null) return null
  const s = String(header).trim().toLowerCase()
  if (!s) return null

  // mês textual + ano: jan/2025, janeiro-2025, jan 25, jan.2025
  let m = s.match(/^(\p{L}{3,9})[\s./-]+(\d{2,4})$/u)
  if (m) {
    const mo = MESES[stripAccents(m[1])]
    if (mo != null) {
      let y = +m[2]
      if (y < 100) y += 2000
      return new Date(y, mo, 1)
    }
  }
  // mm/aaaa (competência numérica)
  m = s.match(/^(\d{1,2})[/.-](\d{4})$/)
  if (m && +m[1] >= 1 && +m[1] <= 12) return new Date(+m[2], +m[1] - 1, 1)
  // aaaa-mm / aaaa/mm
  m = s.match(/^(\d{4})[/.-](\d{1,2})$/)
  if (m && +m[2] >= 1 && +m[2] <= 12) return new Date(+m[1], +m[2] - 1, 1)
  // trimestre: t1/2025, q1-2025, 1t2025
  m = s.match(/^t([1-4])[\s./-]*(\d{4})$/) ||
    s.match(/^q([1-4])[\s./-]*(\d{4})$/) ||
    s.match(/^([1-4])[º°]?\s*t(?:ri\w*)?[\s./-]*(\d{4})$/)
  if (m) return new Date(+m[2], (+m[1] - 1) * 3, 1)
  // ano isolado: 2020..2099
  m = s.match(/^(20\d{2})$/)
  if (m) return new Date(+m[1], 0, 1)

  return null
}

const isBlank = (v) => v == null || String(v).trim() === ''
const isNumericCell = (v) => typeof v === 'number' || (!isBlank(v) && parseBRNumber(v) != null)

/**
 * Decide se a tabela detectada é uma cross-tab (períodos nas colunas). Regras conservadoras
 * para NÃO disparar em relatórios normais: ≥3 colunas-período, ≥1 coluna de identificação,
 * e as colunas-período majoritariamente numéricas.
 * @returns {{ periodCols: {index:number,name:string,date:Date}[], idCols:{index:number,name:string}[] } | null}
 */
export function detectCrosstab(table) {
  if (!table || !table.columns || table.columns.length < 4) return null
  const periodCols = []
  const idCols = []
  for (const col of table.columns) {
    const date = parsePeriodHeader(col.name)
    if (date) periodCols.push({ index: col.index, name: col.name, date })
    else idCols.push({ index: col.index, name: col.name })
  }
  if (periodCols.length < 3 || idCols.length < 1) return null

  // As colunas-período precisam conter, de fato, números (senão é só coincidência de nome).
  const data = table.data || []
  if (data.length) {
    for (const pc of periodCols) {
      let present = 0
      let num = 0
      for (let i = 0; i < data.length; i++) {
        const v = data[i][pc.name]
        if (isBlank(v)) continue
        present++
        if (isNumericCell(v)) num++
      }
      if (present > 0 && num / present < 0.6) return null
    }
  }
  return { periodCols, idCols }
}

const uniqueName = (base, taken) => {
  let name = base
  let k = 2
  const set = new Set(taken)
  while (set.has(name)) name = `${base} (${k++})`
  return name
}

/**
 * Tenta extrair um nome de medida amigável das linhas de TÍTULO descartadas no topo
 * (ex.: "Atendimentos por Setor — Soul MV" => "Atendimentos"). Cai em "Valor" se não achar.
 */
export function deriveMeasureName(rawRows, headerRow) {
  for (let i = 0; i < headerRow; i++) {
    const row = rawRows[i] || []
    const cell = row.find((c) => c != null && String(c).trim() !== '')
    if (!cell) continue
    let t = String(cell).trim().split(/[—–:|]/)[0].trim()
    const byPor = t.match(/^(.+?)\s+por\s+/i)
    if (byPor) t = byPor[1].trim()
    if (t && t.length <= 30 && /\p{L}/u.test(t)) return t
  }
  return 'Valor'
}

/**
 * Aplica o "desempilhamento": gera uma linha por (linha original × coluna-período).
 * Mantém as colunas de identificação e cria duas novas: Período (data) e a medida.
 */
export function unpivotCrosstab(table, crosstab, opts = {}) {
  const { periodCols, idCols } = crosstab
  const idNames = idCols.map((c) => c.name)
  const dateName = uniqueName(opts.dateName || 'Período', idNames)
  const valueName = uniqueName(opts.valueName || 'Valor', [...idNames, dateName])

  const data = []
  for (const row of table.data) {
    for (const pc of periodCols) {
      const raw = row[pc.name]
      if (isBlank(raw)) continue
      const obj = {}
      for (const name of idNames) obj[name] = row[name] ?? null
      obj[dateName] = pc.date
      obj[valueName] = raw
      data.push(obj)
    }
  }

  const columns = [
    ...idNames.map((name, i) => ({ index: i, name })),
    { index: idNames.length, name: dateName },
    { index: idNames.length + 1, name: valueName },
  ]
  return { ...table, columns, data, dateName, valueName }
}
