// Regras que transformam o perfil das colunas em uma lista de widgets do painel.

const MEASURE_RX = /valor|vlr|total|montante|pago|glosa|receita|custo|despesa|quantidade|qtd|saldo|faturad|apresentad|repasse/i
const ID_RX = /\b(id|c[oó]digo|cod|guia|matr[ií]cula|cpf|cnpj|protocolo|n[uú]mero|nº|registro)\b/i

// Seleciona medidas comparáveis entre si para um gráfico multi-série: começa pela
// principal e mantém as que (a) têm soma não-nula, (b) são da MESMA natureza de nome
// (ambas "de medida"/dinheiro ou ambas não), e (c) estão na MESMA ordem de grandeza.
// Ex.: Apresentado/Glosa/Pago (todos R$) ficam juntos; "Quantidade" (escala ~1000×
// menor) e "Peso" (kg, nome de natureza diferente) ficam de fora; medidas zeradas também.
const mag = (p) => Math.log10(Math.max(Math.abs(p.stats.sum || 0), 1))
const hasSum = (p) => Math.abs(p.stats.sum || 0) > 0
function comparableGroup(measures, primaryName) {
  const primary = measures.find((m) => m.name === primaryName)
  if (!primary || !hasSum(primary)) return [] // soma zero/ausente => sem comparativo
  const base = mag(primary)
  const primaryIsMeasure = MEASURE_RX.test(primary.name)
  const group = measures.filter(
    (m) =>
      hasSum(m) &&
      MEASURE_RX.test(m.name) === primaryIsMeasure &&
      Math.abs(mag(m) - base) <= 1.5,
  )
  return group.length >= 2 ? group.map((m) => m.name) : []
}

// opts.primaryMeasure (opcional, Fase G): força a medida principal escolhida pelo usuário.
export function buildDashboard(profiles, data, opts = {}) {
  const numbers = profiles.filter((p) => p.type === 'number' && !ID_RX.test(p.name))
  // Medidas somáveis (valores, quantidades) vs. medidas que só fazem sentido como
  // média (taxas, %, idade). Só as somáveis viram "Total" e alimentam os gráficos.
  const summables = numbers.filter((p) => p.stats.agg !== 'avg')
  const averages = numbers.filter((p) => p.stats.agg === 'avg')
  const cats = profiles.filter((p) => p.type === 'category')
  const dates = profiles.filter((p) => p.type === 'date')

  // Medida principal: prioriza nomes "de dinheiro", depois maior soma.
  const measures = [...summables].sort((a, b) => {
    const am = MEASURE_RX.test(a.name) ? 1 : 0
    const bm = MEASURE_RX.test(b.name) ? 1 : 0
    if (am !== bm) return bm - am
    return (b.stats.sum || 0) - (a.stats.sum || 0)
  })
  // Override manual: traz a medida escolhida para o topo (se for somável e existir).
  if (opts.primaryMeasure) {
    const i = measures.findIndex((m) => m.name === opts.primaryMeasure)
    if (i > 0) measures.unshift(measures.splice(i, 1)[0])
  }
  const primary = measures[0]?.name || null
  const dateCol = dates[0]?.name || null
  // Dimensões úteis: ao menos 2 níveis, menor cardinalidade primeiro.
  const dims = cats
    .filter((c) => c.stats.distinct >= 2)
    .sort((a, b) => a.stats.distinct - b.stats.distinct)

  const widgets = []

  // KPIs — DESCRITORES (agg + medida). O valor é calculado sobre os dados FILTRADOS
  // no Dashboard, para os cards reagirem aos filtros.
  const items = [{ label: 'Registros', agg: 'count', kind: 'int' }]
  for (const m of measures.slice(0, 3)) {
    items.push({ label: `Total · ${m.name}`, agg: 'sum', measure: m.name, kind: 'num' })
  }
  if (measures[0]) {
    items.push({ label: `Média · ${measures[0].name}`, agg: 'avg', measure: measures[0].name, kind: 'num' })
  }
  // Medidas intensivas (taxa/%/idade): só como média, nunca somadas.
  for (const a of averages.slice(0, 2)) {
    items.push({ label: `Média · ${a.name}`, agg: 'avg', measure: a.name, kind: 'num', percent: a.stats.isPercent })
  }
  widgets.push({ type: 'kpis', items })

  // Grupo de medidas comparáveis (R$ apresentado × glosa × pago, etc.).
  const group = comparableGroup(measures, primary)
  const multi = group.length >= 2

  // Série temporal — multi-série quando há grupo comparável.
  // (A granularidade dia/semana/mês/… é decidida no ChartWidget conforme os dados filtrados.)
  if (dateCol && primary) {
    if (multi) {
      widgets.push({ type: 'lines', title: 'Evolução comparada', dateCol, measures: group })
    } else {
      widgets.push({ type: 'line', title: `Evolução de ${primary}`, dateCol, measure: primary })
    }
  }
  // Ranking pela dimensão de menor cardinalidade — barras agrupadas quando há grupo.
  if (dims[0] && primary) {
    if (multi) {
      widgets.push({ type: 'bars', title: `Comparativo por ${dims[0].name}`, dim: dims[0].name, measures: group })
    } else {
      widgets.push({ type: 'bar', title: `Top ${dims[0].name} · ${primary}`, dim: dims[0].name, measure: primary })
    }
  }
  // Distribuição (rosca)
  const pieDim = dims[1] || dims[0]
  if (pieDim && primary) {
    widgets.push({ type: 'pie', title: `${primary} por ${pieDim.name}`, dim: pieDim.name, measure: primary })
  }
  // Matriz
  if (dims[0] && dims[1] && primary) {
    widgets.push({
      type: 'pivot',
      title: `${dims[0].name} × ${dims[1].name} · ${primary}`,
      rowDim: dims[0].name,
      colDim: dims[1].name,
      measure: primary,
    })
  }

  return {
    widgets,
    primary,
    dateCol,
    dims: dims.map((d) => d.name),
    measures: measures.map((m) => m.name),
    measureGroup: group,
  }
}
