import { describe, it, expect } from 'vitest'
import { parsePeriodHeader, detectCrosstab, unpivotCrosstab, deriveMeasureName } from '../lib/unpivot'
import { analyzeDataset } from '../lib/analysis'

describe('parsePeriodHeader', () => {
  it('entende mês textual + ano (com e sem acento, abreviado e por extenso)', () => {
    expect(parsePeriodHeader('jan/2025')).toEqual(new Date(2025, 0, 1))
    expect(parsePeriodHeader('Dez/25')).toEqual(new Date(2025, 11, 1))
    expect(parsePeriodHeader('março/2025')).toEqual(new Date(2025, 2, 1))
    expect(parsePeriodHeader('janeiro-2024')).toEqual(new Date(2024, 0, 1))
    expect(parsePeriodHeader('ago 2023')).toEqual(new Date(2023, 7, 1))
  })
  it('entende competência numérica e ISO', () => {
    expect(parsePeriodHeader('03/2025')).toEqual(new Date(2025, 2, 1))
    expect(parsePeriodHeader('2025-04')).toEqual(new Date(2025, 3, 1))
  })
  it('entende trimestre e ano isolado', () => {
    expect(parsePeriodHeader('T1/2025')).toEqual(new Date(2025, 0, 1))
    expect(parsePeriodHeader('Q3 2024')).toEqual(new Date(2024, 6, 1))
    expect(parsePeriodHeader('2025')).toEqual(new Date(2025, 0, 1))
  })
  it('NÃO confunde nomes comuns de coluna com período', () => {
    for (const h of ['Setor', 'Convênio', 'Valor Pago', 'Competência', 'Quantidade', '', null, 'Janela']) {
      expect(parsePeriodHeader(h)).toBeNull()
    }
  })
})

// Cross-tab no estilo Soul MV: 1 coluna de identificação + 12 meses nas colunas.
function crosstabTable() {
  const meses = ['jan/2025', 'fev/2025', 'mar/2025', 'abr/2025', 'mai/2025', 'jun/2025']
  const columns = [{ index: 0, name: 'Setor' }, ...meses.map((m, i) => ({ index: i + 1, name: m }))]
  const setores = ['Pronto Socorro', 'UTI', 'Internação']
  const data = setores.map((s) => {
    const row = { Setor: s }
    meses.forEach((m, i) => { row[m] = 100 + i })
    return row
  })
  return { headerRow: 2, columns, data, droppedTop: 2, droppedTotals: 0 }
}

describe('detectCrosstab', () => {
  it('detecta a cross-tab (períodos nas colunas)', () => {
    const ct = detectCrosstab(crosstabTable())
    expect(ct).not.toBeNull()
    expect(ct.periodCols).toHaveLength(6)
    expect(ct.idCols.map((c) => c.name)).toEqual(['Setor'])
  })
  it('NÃO dispara em tabela normal (sem período nas colunas)', () => {
    const table = {
      columns: [
        { index: 0, name: 'Convênio' }, { index: 1, name: 'Valor Apresentado' },
        { index: 2, name: 'Glosa' }, { index: 3, name: 'Valor Pago' },
      ],
      data: [{ Convênio: 'Unimed', 'Valor Apresentado': 10, Glosa: 1, 'Valor Pago': 9 }],
    }
    expect(detectCrosstab(table)).toBeNull()
  })
  it('NÃO dispara se as colunas-período não forem numéricas', () => {
    const t = crosstabTable()
    for (const row of t.data) for (const k of Object.keys(row)) if (k !== 'Setor') row[k] = 'texto'
    expect(detectCrosstab(t)).toBeNull()
  })
})

describe('unpivotCrosstab', () => {
  it('desempilha para formato longo com colunas Período/Valor', () => {
    const t = crosstabTable()
    const ct = detectCrosstab(t)
    const u = unpivotCrosstab(t, ct, { valueName: 'Atendimentos' })
    expect(u.columns.map((c) => c.name)).toEqual(['Setor', 'Período', 'Atendimentos'])
    expect(u.data).toHaveLength(3 * 6) // 3 setores × 6 meses
    expect(u.data[0].Período).toBeInstanceOf(Date)
    expect(typeof u.data[0].Atendimentos).toBe('number')
  })
  it('evita colisão de nomes', () => {
    const t = crosstabTable()
    t.columns[0].name = 'Período'
    t.data = t.data.map((r) => { const { Setor, ...rest } = r; return { Período: Setor, ...rest } })
    const ct = detectCrosstab(t)
    const u = unpivotCrosstab(t, ct)
    expect(u.columns.map((c) => c.name)).toContain('Período (2)')
  })
})

describe('deriveMeasureName', () => {
  it('extrai a medida do título descartado', () => {
    expect(deriveMeasureName([['Atendimentos por Setor — Soul MV'], [], []], 2)).toBe('Atendimentos')
    expect(deriveMeasureName([['Faturamento: 2025']], 1)).toBe('Faturamento')
  })
  it('cai em "Valor" quando não há título', () => {
    expect(deriveMeasureName([], 0)).toBe('Valor')
  })
})

describe('analyzeDataset com cross-tab (ponta a ponta)', () => {
  // Matriz crua estilo Soul MV: título, subtítulo, cabeçalho real, dados.
  const rows = [
    ['Atendimentos por Setor — Soul MV'],
    ['Competência: Exercício 2025'],
    ['Setor', 'jan/2025', 'fev/2025', 'mar/2025', 'abr/2025'],
    ['Pronto Socorro', 1200, 1300, 1250, 1400],
    ['UTI Adulto', 300, 310, 320, 305],
    ['Internação', 800, 850, 810, 900],
  ]

  it('reorganiza e monta série temporal com a medida nomeada do título', () => {
    const r = analyzeDataset(rows)
    expect(r.crosstab.applied).toBe(true)
    expect(r.crosstab.valueName).toBe('Atendimentos')
    expect(r.dash.dateCol).toBe('Período')
    expect(r.dash.primary).toBe('Atendimentos')
    // não deve sobrar nenhuma "medida" com nome de mês
    expect(r.dash.measures.some((m) => /\d{4}/.test(m))).toBe(false)
    expect(r.profiles.find((p) => p.name === 'Setor').type).toBe('category')
    expect(r.profiles.find((p) => p.name === 'Período').type).toBe('date')
  })

  it('respeita o desligamento manual (overrides.unpivot = off)', () => {
    const r = analyzeDataset(rows, { unpivot: 'off' })
    expect(r.crosstab.applied).toBe(false)
    expect(r.crosstab.available).toBe(true)
    expect(r.dash.dateCol).toBeNull() // sem desempilhar, não há eixo de tempo
  })
})
