import { describe, it, expect } from 'vitest'
import { detectTable } from '../lib/detectTable'
import { analyzeDataset } from '../lib/analysis'

// Cabeçalho agrupado de 2 linhas: anos mesclados (linha de grupo) sobre sub-colunas.
const grouped = [
  ['Produção por Convênio'],
  ['', '2024', '', '2025', ''],
  ['Convênio', 'Apresentado', 'Glosa', 'Apresentado', 'Glosa'],
  ['Unimed', '1000', '100', '1200', '150'],
  ['Amil', '800', '80', '900', '90'],
  ['TOTAL', '1800', '180', '2100', '240'],
]

describe('detectTable — cabeçalho de múltiplas linhas (Fase A)', () => {
  it('mescla grupo + sub propagando o rótulo do grupo (células mescladas)', () => {
    const t = detectTable(grouped)
    expect(t.headerRow).toBe(2)
    expect(t.headerRows).toBe(2)
    expect(t.droppedTop).toBe(1) // só o título (linha 0)
    expect(t.columns.map((c) => c.name)).toEqual([
      'Convênio', '2024 · Apresentado', '2024 · Glosa', '2025 · Apresentado', '2025 · Glosa',
    ])
    expect(t.data).toHaveLength(2) // total removido
    expect(t.data[0]['2025 · Apresentado']).toBe('1200')
  })

  it('NÃO mescla quando há só uma linha de cabeçalho (sem regressão)', () => {
    const single = [
      ['Relatório'],
      ['Médico', 'Valor'],
      ['Dr A', '100'],
    ]
    const t = detectTable(single)
    expect(t.headerRows).toBe(1)
    expect(t.columns.map((c) => c.name)).toEqual(['Médico', 'Valor'])
  })

  it('cabeçalho forçado ignora a mesclagem (vale exatamente a linha escolhida)', () => {
    const t = detectTable(grouped, 2)
    expect(t.headerRows).toBe(1)
    expect(t.droppedTop).toBe(2)
    expect(t.columns[1].name).toBe('Apresentado') // sem prefixo do grupo
  })
})

describe('analyzeDataset — cabeçalho agrupado (ponta a ponta)', () => {
  it('perfila as colunas mescladas e monta o painel sem nomes ambíguos', () => {
    const r = analyzeDataset(grouped)
    expect(r.crosstab.applied).toBe(false)
    const names = r.profiles.map((p) => p.name)
    expect(names).toContain('2024 · Apresentado')
    expect(names).toContain('2025 · Glosa')
    expect(r.profiles.find((p) => p.name === 'Convênio').type).toBe('category')
    // as 4 colunas de valor viram medidas somáveis (number)
    expect(r.profiles.filter((p) => p.type === 'number')).toHaveLength(4)
    expect(r.dash.primary).toMatch(/Apresentado/)
  })
})
