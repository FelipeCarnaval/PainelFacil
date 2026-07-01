import { describe, it, expect } from 'vitest'
import { buildSummary, insightSentence } from '../lib/summary'

describe('insightSentence — frases em texto puro', () => {
  it('tendência, vsavg, mover, pico e concentração', () => {
    expect(
      insightSentence({ type: 'trend', measure: 'Valor Pago', gran: 'month', delta: 0.123, prevKey: '2025-02', lastKey: '2025-03' }),
    ).toBe('Valor Pago subiu 12,3% no último mês (fev/25 → mar/25).')

    expect(
      insightSentence({ type: 'vsavg', measure: 'Valor', gran: 'month', delta: -0.42, lastKey: '2025-03', periods: 5 }),
    ).toContain('42% abaixo da média dos 5 anteriores')

    expect(
      insightSentence({ type: 'mover', dim: 'Convênio', measure: 'Valor', gran: 'month', key: 'Amil', delta: 0.34, prevKey: '2025-02', lastKey: '2025-03' }),
    ).toBe('Amil foi quem mais cresceu em Valor: 34% (fev/25 → mar/25).')

    expect(
      insightSentence({ type: 'peak', measure: 'Valor', gran: 'month', periodKey: '2025-01', value: 1500000, share: 0.4 }),
    ).toContain('Melhor mês: jan/25')

    expect(
      insightSentence({ type: 'concentration', dim: 'Convênio', measure: 'Valor', topKey: 'Unimed', share: 0.45, groupCount: 8 }),
    ).toBe('Unimed concentra 45% de Valor entre 8 convênio(s).')
  })

  it('tipo desconhecido devolve null', () => {
    expect(insightSentence({ type: 'zzz' })).toBeNull()
  })
})

describe('buildSummary — resumo executivo', () => {
  const base = {
    fileName: 'producao_marco.xlsx',
    count: 950,
    total: 1200,
    kpis: [
      { label: 'Registros', agg: 'count', kind: 'int', value: 950 },
      { label: 'Total · Valor Pago', agg: 'sum', measure: 'Valor Pago', kind: 'num', value: 1234567, trend: 0.08 },
      { label: 'Média · Taxa de Glosa', agg: 'avg', measure: 'Taxa de Glosa', kind: 'num', value: 4.2, percent: true },
    ],
    insights: [
      { type: 'trend', measure: 'Valor Pago', gran: 'month', delta: 0.08, prevKey: '2025-02', lastKey: '2025-03' },
    ],
  }

  it('inclui cabeçalho, contagem, KPIs (com R$ e tendência) e destaques', () => {
    const text = buildSummary(base)
    expect(text).toContain('producao_marco.xlsx')
    expect(text).toContain('950 de 1.200 registros')
    expect(text).toContain('Indicadores:')
    expect(text).toContain('• Total · Valor Pago: R$ 1,2 mi (↑ 8,0% vs período anterior)')
    expect(text).toContain('• Média · Taxa de Glosa: 4,20%')
    expect(text).toContain('Destaques:')
    expect(text).toContain('Valor Pago subiu 8,0%')
  })

  it('descreve os filtros ativos', () => {
    const text = buildSummary({
      ...base,
      dimFilters: { Convênio: new Set(['Unimed']) },
      dateFrom: new Date(2025, 0, 1),
      dateTo: new Date(2025, 2, 31),
    })
    expect(text).toContain('filtros — Convênio: Unimed')
    expect(text).toContain('período: 01/01/2025 a 31/03/2025')
  })

  it('sem KPIs nem destaques, mantém só o cabeçalho', () => {
    const text = buildSummary({ fileName: 'x.csv', count: 10, total: 10 })
    expect(text).not.toContain('Indicadores:')
    expect(text).not.toContain('Destaques:')
  })
})
