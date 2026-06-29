import { parseBRNumber, parseBRDate } from './brFormat'

// Acessores que normalizam uma célula para número/data, tolerando padrão BR.
export const numOf = (v) =>
  v == null ? null : typeof v === 'number' ? v : parseBRNumber(v)
export const dateOf = (v) =>
  v instanceof Date ? v : v == null ? null : parseBRDate(v)

// Colunas numéricas cujo nome indica taxa/proporção/medida intensiva: somar não faz
// sentido, só média (ex.: "Taxa de Ocupação", "Idade", "% Glosa", "Ticket Médio").
const RATIO_RX = /(%|percent|\btaxa\b|propor[çc][aã]o|[íi]ndice|\bidade\b|m[eé]di[ao]|ticket|\bnota\b|score|\bimc\b|al[íi]quota|\btempo\b|m[eé]dia\b)/i

// Para cada coluna, infere o tipo (number | date | category | text | empty) e calcula
// estatísticas. typeOverrides (opcional, Fase G): { nomeDaColuna: tipoForçado }.
export function profileColumns(columns, data, typeOverrides = {}) {
  const total = data.length
  return columns.map((col) => {
    const name = col.name
    const values = data
      .map((row) => row[name])
      .filter((v) => v != null && String(v).trim() !== '')
    const present = values.length

    let numCount = 0
    let dateCount = 0
    let pctCount = 0
    const nums = []
    const dates = []
    for (const v of values) {
      if (v instanceof Date) {
        dateCount++
        dates.push(v)
        continue
      }
      if (typeof v === 'number') {
        numCount++
        nums.push(v)
        continue
      }
      if (typeof v === 'string' && v.includes('%')) pctCount++
      const n = parseBRNumber(v)
      if (n != null) {
        numCount++
        nums.push(n)
        continue
      }
      const d = parseBRDate(v)
      if (d != null) {
        dateCount++
        dates.push(d)
      }
    }

    const distinctSet = new Set(values.map((v) => (v instanceof Date ? v.getTime() : v)))
    const distinct = distinctSet.size
    const distinctRatio = distinct / Math.max(present, 1)

    let type = 'text'
    if (present === 0) type = 'empty' // coluna sem nenhum valor: fora de widgets/filtros
    else if (numCount / present >= 0.8) type = 'number'
    else if (dateCount / present >= 0.8) type = 'date'
    // Categórica = serve para agrupar/filtrar. Não fixa um teto rígido de 50 níveis:
    // aceita conjuntos pequenos (≤ 20) ou colunas que repetem bastante (até ~2000 níveis),
    // mas rejeita texto quase único (descrições, observações, números de guia).
    else if (distinct >= 1 && (distinct <= 20 || (distinctRatio <= 0.5 && distinct <= 2000)))
      type = 'category'

    // Correção manual (Fase G): o usuário pode forçar o tipo desta coluna.
    if (typeOverrides[name]) type = typeOverrides[name]

    const stats = { distinct, present, missing: total - present }
    if (type === 'number' && nums.length) {
      let sum = 0
      let min = Infinity
      let max = -Infinity
      for (const n of nums) {
        sum += n
        if (n < min) min = n
        if (n > max) max = n
      }
      stats.sum = sum
      stats.avg = sum / nums.length
      stats.min = min
      stats.max = max
      // Como agregar esta medida por padrão: taxas/proporções/medidas intensivas só
      // fazem sentido em média; o resto (valores, quantidades) soma.
      const isPercent = present > 0 && pctCount / present >= 0.5
      stats.isPercent = isPercent
      stats.agg = isPercent || RATIO_RX.test(name) ? 'avg' : 'sum'
    }
    if (type === 'date' && dates.length) {
      let min = Infinity
      let max = -Infinity
      for (const d of dates) {
        const t = d.getTime()
        if (t < min) min = t
        if (t > max) max = t
      }
      stats.min = new Date(min)
      stats.max = new Date(max)
    }
    return { name, type, stats }
  })
}
