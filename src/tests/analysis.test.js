import { describe, it, expect } from 'vitest'
import { analyzeDataset } from '../lib/analysis'
import { keyOf, isValidDate } from '../lib/utils'

// Aba "suja" no estilo Benner: título no topo, cabeçalho real, dados e uma linha de total.
function sampleRows(n = 60) {
  const rows = [['Relatório de Produção — Hospital']]
  rows.push(['Competência', 'Convênio', 'Valor Apresentado', 'Glosa'])
  let total = 0
  for (let i = 0; i < n; i++) {
    const apres = 1000 + i
    total += apres
    rows.push([`15/${String((i % 6) + 1).padStart(2, '0')}/2025`, ['Unimed', 'Amil'][i % 2], String(apres), '50'])
  }
  rows.push(['TOTAL', '', String(total), ''])
  return rows
}

describe('analyzeDataset (orquestrador ponta-a-ponta)', () => {
  const rows = sampleRows()

  it('limpa topo/totais, perfila e monta o painel', () => {
    const r = analyzeDataset(rows)
    expect(r.table.headerRow).toBe(1)
    expect(r.table.droppedTotals).toBe(1)
    expect(r.table.data).toHaveLength(60)
    expect(r.dash.primary).toBe('Valor Apresentado')
    expect(r.profiles.find((p) => p.name === 'Competência').type).toBe('date')
    expect(r.preview.length).toBeGreaterThan(0)
    expect(r.preview.length).toBeLessThanOrEqual(30)
  })

  it('aplica todos os overrides (cabeçalho, tipo, exclusão, medida)', () => {
    const r = analyzeDataset(rows, {
      headerRow: 1,
      types: { Convênio: 'text' },
      excluded: ['Glosa'],
      primary: 'Valor Apresentado',
    })
    expect(r.allProfiles.find((p) => p.name === 'Convênio').type).toBe('text')
    expect(r.profiles.some((p) => p.name === 'Glosa')).toBe(false) // excluída
    expect(r.dash.primary).toBe('Valor Apresentado')
  })
})

describe('utils', () => {
  it('keyOf normaliza vazios', () => {
    expect(keyOf(null)).toBe('(vazio)')
    expect(keyOf('  x ')).toBe('x')
  })
  it('isValidDate', () => {
    expect(isValidDate(new Date('2025-03-15'))).toBe(true)
    expect(isValidDate(new Date('lixo'))).toBe(false)
    expect(isValidDate('2025')).toBe(false)
  })
})
