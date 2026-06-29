import { describe, it, expect } from 'vitest'
import { profileColumns } from '../lib/profile'
import { buildDashboard } from '../lib/suggestCharts'

const profile = (rows) =>
  profileColumns(Object.keys(rows[0]).map((name, index) => ({ index, name })), rows)

describe('buildDashboard', () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({
    'Competência': `15/${String((i % 6) + 1).padStart(2, '0')}/2025`,
    'Convênio': ['Unimed', 'Amil', 'Bradesco'][i % 3],
    'Valor Apresentado': 1000 + (i % 50),
    'Glosa': 100 + (i % 10),
    'Valor Pago': 900 + (i % 40),
    'Quantidade': 1 + (i % 8),
    'Taxa de Ocupação': `${60 + (i % 30)}%`,
  }))
  const dash = buildDashboard(profile(rows), rows)

  it('escolhe medida principal de dinheiro e KPIs corretos', () => {
    expect(dash.primary).toBe('Valor Apresentado')
    const labels = dash.widgets.find((w) => w.type === 'kpis').items.map((i) => i.label)
    expect(labels.some((l) => l.startsWith('Total · Valor Apresentado'))).toBe(true)
    expect(labels.some((l) => l.includes('Total · Taxa'))).toBe(false) // taxa nunca somada
    expect(labels.some((l) => l.includes('Média · Taxa'))).toBe(true)
  })

  it('grupo comparável só com medidas da mesma natureza/escala', () => {
    expect(dash.measureGroup).toContain('Valor Apresentado')
    expect(dash.measureGroup).toContain('Valor Pago')
    expect(dash.measureGroup).not.toContain('Quantidade') // escala muito menor
    expect(dash.widgets.some((w) => w.type === 'bars')).toBe(true)
    expect(dash.widgets.some((w) => w.type === 'lines')).toBe(true)
  })

  it('exclui medidas de nome de natureza diferente (Peso × Valor)', () => {
    const d = Array.from({ length: 50 }, () => ({
      'Valor Pago': 200, 'Valor Glosado': 60, 'Peso': 75,
    }))
    const dash2 = buildDashboard(profile(d), d)
    expect(dash2.measureGroup).toContain('Valor Pago')
    expect(dash2.measureGroup).not.toContain('Peso')
  })

  it('override de medida principal + fallback', () => {
    expect(buildDashboard(profile(rows), rows, { primaryMeasure: 'Valor Pago' }).primary).toBe('Valor Pago')
    expect(buildDashboard(profile(rows), rows, { primaryMeasure: 'X' }).primary).toBe('Valor Apresentado')
  })

  it('IDs nunca viram medida', () => {
    const d = Array.from({ length: 30 }, (_, i) => ({ CPF: 1000 + i, Valor: 50 }))
    const dash3 = buildDashboard(profile(d), d)
    expect(dash3.measures).not.toContain('CPF')
  })
})
