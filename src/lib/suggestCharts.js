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

// Detecta taxas automáticas no dataset hospitalar/financeiro. Procura por padrões
// como "Glosa"/"Apresentado", "Pago"/"Apresentado", "Recusado"/"Solicitado", etc.,
// e retorna um array de pares [numerador, denominador] para criar KPIs de taxa.
// Ex.: { Glosa: 5000, Apresentado: 100000 } → ['Glosa', 'Apresentado'] → Taxa de Glosa 5%
function detectRates(measures) {
  const rates = []
  const measured = new Set(measures.map((m) => m.name.toLowerCase()))
  
  // Padrões [numerador, denominador] — detecta em ordem de prioridade.
  const patterns = [
    ['glosa', 'apresentado'],      // Taxa de glosa (sistema de saúde)
    ['pago', 'apresentado'],       // Taxa de pagamento
    ['negado', 'apresentado'],     // Taxa de negação/recusa
    ['recusado', 'solicitado'],    // Taxa de recusa
    ['cancelado', 'solicitado'],   // Taxa de cancelamento
    ['erro', 'processado'],        // Taxa de erro
    ['devolvido', 'enviado'],      // Taxa de devolução
    ['devolvido', 'apresentado'],  // Taxa de devolução (alt)
    ['desconto', 'faturado'],      // Taxa de desconto
    ['imposto', 'faturado'],       // Taxa de impostos
    ['perda', 'total'],            // Taxa de perda
  ]
  
  for (const [num, denom] of patterns) {
    const hasNum = [...measured].find((m) => m.includes(num))
    const hasDenom = [...measured].find((m) => m.includes(denom))
    
    if (hasNum && hasDenom && hasNum !== hasDenom) {
      const numFull = measures.find((m) => m.name.toLowerCase().includes(num))?.name
      const denomFull = measures.find((m) => m.name.toLowerCase().includes(denom))?.name
      if (numFull && denomFull && !rates.some((r) => r[0] === numFull || r[1] === denomFull)) {
        rates.push([numFull, denomFull])
        if (rates.length >= 2) break // Máximo 2 taxas automáticas
      }
    }
  }
  
  return rates
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
  
  // KPIs automáticos de taxa (glosa, recebimento, etc.) — hospitalar e financeiro.
  const rates = detectRates(measures)
  for (const [num, denom] of rates) {
    const rateName = num.replace(/\s*(de|do|da)\s*/gi, ' ').trim()
    items.push({
      label: `Taxa de ${rateName}`,
      agg: 'rate',
      measures: [num, denom],
      kind: 'num',
      percent: true,
    })
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
  // Participação no total (barras de proporção — mais legível que pizza/rosca).
  const distDim = dims[1] || dims[0]
  if (distDim && primary) {
    widgets.push({ type: 'dist', title: `${primary} por ${distDim.name}`, dim: distDim.name, measure: primary })
  }
  // Ranking detalhado: a dimensão de MAIOR cardinalidade (procedimento, médico,
  // cliente…), onde o controle "Top N" realmente importa. A participação resume; este lista.
  const bigDim = dims[dims.length - 1]
  if (bigDim && primary && bigDim.stats.distinct >= 8 && bigDim.name !== dims[0].name) {
    widgets.push({ type: 'bar', title: `Top ${bigDim.name} · ${primary}`, dim: bigDim.name, measure: primary })
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
