import { describe, it, expect } from 'vitest'
import { buildEngine, computeView, viewSignature } from '../lib/engine'
import { profileColumns } from '../lib/profile'
import { buildDashboard } from '../lib/suggestCharts'
import { groupAgg, pivot } from '../lib/aggregate'
import { keyOf } from '../lib/utils'

function setup(n = 300) {
  const conv = ['Unimed', 'Amil', 'Bradesco']
  const esp = ['Cardio', 'Orto', 'Pediatria', 'Clínica']
  const rows = []
  for (let i = 0; i < n; i++) {
    rows.push({
      'Competência': `15/${String((i % 6) + 1).padStart(2, '0')}/2025`,
      'Convênio': conv[i % 3],
      'Especialidade': esp[i % 4],
      'Valor Apresentado': 1000 + (i % 97),
      'Glosa': 50 + (i % 13),
      'Valor Pago': 900 + (i % 71),
      'Quantidade': 1 + (i % 8),
    })
  }
  const cols = Object.keys(rows[0]).map((name, index) => ({ index, name }))
  const profiles = profileColumns(cols, rows)
  const dash = buildDashboard(profiles, rows)
  const engine = buildEngine({ data: rows }, profiles)
  return { rows, profiles, dash, engine }
}

describe('buildEngine', () => {
  it('cria colunas tipadas e índice invertido', () => {
    const { engine } = setup()
    expect(engine.numCols['Valor Apresentado']).toBeInstanceOf(Float64Array)
    expect(engine.timeCols['Competência']).toBeInstanceOf(Float64Array)
    expect(engine.index['Convênio'].get('Unimed')).toBeInstanceOf(Uint32Array)
    expect(engine.dimOptions['Convênio']).toContain('Unimed')
  })
})

describe('computeView — paridade com as funções atuais', () => {
  const { rows, dash, engine } = setup()

  it('KPI de soma bate com a soma direta', () => {
    const view = computeView(engine, dash, {}, {})
    const reg = view.kpis.find((k) => k.agg === 'count').value
    expect(reg).toBe(rows.length)
    const totalApres = view.kpis.find((k) => k.label.startsWith('Total · Valor Apresentado')).value
    const expected = rows.reduce((a, r) => a + r['Valor Apresentado'], 0)
    expect(totalApres).toBe(expected)
  })

  it('barras agrupadas/pizza batem com groupAgg', () => {
    const view = computeView(engine, dash, {}, {})
    const barsWidget = view.charts.find((c) => c.type === 'bars')
    const dim = dash.widgets.find((w) => w.type === 'bars').dim
    const expected = groupAgg(rows, dim, dash.primary).slice(0, 6).map((d) => d.key)
    expect(barsWidget.data.map((d) => d.name)).toEqual(expected)
  })

  it('pivot bate com a função pivot', () => {
    const view = computeView(engine, dash, {}, {})
    const pv = view.charts.find((c) => c.type === 'pivot')
    if (pv) {
      const spec = dash.widgets.find((w) => w.type === 'pivot')
      const expected = pivot(rows, spec.rowDim, spec.colDim, spec.measure)
      expect(pv.rows).toEqual(expected.rows)
      expect(pv.max).toBe(expected.max)
    }
  })

  it('linha temporal tem granularidade e dados', () => {
    const view = computeView(engine, dash, {}, {})
    const line = view.charts.find((c) => c.type === 'line' || c.type === 'lines')
    expect(line.gran).toBeTruthy()
    expect(line.data.length).toBeGreaterThan(0)
  })
})

describe('computeView — filtros via índice batem com filtro ingênuo', () => {
  const { rows, dash, engine } = setup()

  it('1 dimensão', () => {
    const view = computeView(engine, dash, { dims: { 'Convênio': ['Unimed'] } }, {})
    const naive = rows.filter((r) => keyOf(r['Convênio']) === 'Unimed')
    expect(view.count).toBe(naive.length)
    const bars = view.charts.find((c) => c.type === 'bars')
    const dim = dash.widgets.find((w) => w.type === 'bars').dim
    expect(bars.data.map((d) => d.name)).toEqual(groupAgg(naive, dim, dash.primary).slice(0, 6).map((d) => d.key))
  })

  it('2 dimensões combinadas (interseção)', () => {
    const filters = { dims: { 'Convênio': ['Unimed', 'Amil'], 'Especialidade': ['Cardio'] } }
    const view = computeView(engine, dash, filters, {})
    const naive = rows.filter(
      (r) => ['Unimed', 'Amil'].includes(keyOf(r['Convênio'])) && keyOf(r['Especialidade']) === 'Cardio',
    )
    expect(view.count).toBe(naive.length)
  })

  it('filtro de data por intervalo', () => {
    const from = new Date(2025, 2, 1).getTime() // março
    const to = new Date(2025, 3, 30).getTime() // abril
    const view = computeView(engine, dash, { dateCol: 'Competência', dateFrom: from, dateTo: to }, {})
    const naive = rows.filter((r) => {
      const [d, m, y] = r['Competência'].split('/')
      const t = new Date(+y, +m - 1, +d).getTime()
      return t >= from && t <= to
    })
    expect(view.count).toBe(naive.length)
  })
})

describe('tablePage — ordenação e paginação no engine', () => {
  const { engine, dash } = setup(60)
  it('ordena por número desc e pagina', () => {
    const view = computeView(engine, dash, {}, { sort: { col: 'Valor Apresentado', dir: -1 }, page: 0, pageSize: 10 })
    expect(view.table.rows).toHaveLength(10)
    expect(view.table.total).toBe(60)
    const vals = view.table.rows.map((r) => r['Valor Apresentado'])
    expect(vals).toEqual([...vals].sort((a, b) => b - a))
  })
})

describe('viewSignature — estável (para cache)', () => {
  it('ordem das seleções não muda a assinatura', () => {
    const a = viewSignature({ dims: { Conv: ['B', 'A'] } }, {})
    const b = viewSignature({ dims: { Conv: ['A', 'B'] } }, {})
    expect(a).toBe(b)
  })
  it('filtros diferentes => assinaturas diferentes', () => {
    expect(viewSignature({ dims: { Conv: ['A'] } }, {})).not.toBe(viewSignature({ dims: { Conv: ['B'] } }, {}))
  })
})

describe('computeView — mini-tendência (sparkline) e variação dos KPIs', () => {
  const { rows, dash, engine } = setup()

  it('KPI de soma ganha sparkline por período que soma o total', () => {
    const view = computeView(engine, dash, {}, {})
    const kpi = view.kpis.find((k) => k.label.startsWith('Total · Valor Apresentado'))
    expect(Array.isArray(kpi.spark)).toBe(true)
    expect(kpi.spark.length).toBeGreaterThanOrEqual(2)
    const somaSpark = kpi.spark.reduce((a, b) => a + b, 0)
    expect(Math.round(somaSpark)).toBe(Math.round(kpi.value))
  })

  it('KPI de contagem: sparkline soma a quantidade de registros', () => {
    const view = computeView(engine, dash, {}, {})
    const kpi = view.kpis.find((k) => k.agg === 'count')
    expect(kpi.spark.reduce((a, b) => a + b, 0)).toBe(rows.length)
  })

  it('variação (trend) reflete o último período vs. o anterior', () => {
    const view = computeView(engine, dash, {}, {})
    const kpi = view.kpis.find((k) => k.agg === 'sum' && k.spark)
    const s = kpi.spark
    const esperado = s[s.length - 2] !== 0 ? (s[s.length - 1] - s[s.length - 2]) / s[s.length - 2] : null
    if (esperado === null) expect(kpi.trend).toBeNull()
    else expect(kpi.trend).toBeCloseTo(esperado)
  })

  it('sem coluna de data, não há sparkline', () => {
    const view = computeView(engine, { ...dash, dateCol: null }, {}, {})
    expect(view.kpis.every((k) => k.spark == null)).toBe(true)
  })
})

describe('computeView — dim nos gráficos (para drill-down)', () => {
  const { dash, engine } = setup()

  it('barras e rosca carregam a dimensão de origem', () => {
    const view = computeView(engine, dash, {}, {})
    const drilláveis = view.charts.filter((c) => ['bar', 'bars', 'pie'].includes(c.type))
    expect(drilláveis.length).toBeGreaterThan(0)
    for (const c of drilláveis) {
      const w = dash.widgets.find((w) => w.type === c.type)
      expect(c.dim).toBe(w.dim)
    }
  })
})

describe('computeView — Top N e granularidade forçados', () => {
  const { dash, engine } = setup()

  it('limita o ranking ao Top N e força a granularidade', () => {
    const view = computeView(engine, dash, {}, {}, { topN: 2, gran: 'year' })
    for (const c of view.charts) {
      if (c.type === 'bar' || c.type === 'bars') expect(c.data.length).toBeLessThanOrEqual(2)
      if (c.type === 'pie') expect(c.data.length).toBeLessThanOrEqual(3) // top 2 + "Outros"
      if (c.type === 'line' || c.type === 'lines') expect(c.gran).toBe('year')
    }
  })

  it('a assinatura de cache muda com as opções dos gráficos', () => {
    expect(viewSignature({}, {}, { topN: 5 })).not.toBe(viewSignature({}, {}, { topN: 10 }))
  })
})
