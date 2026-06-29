import { describe, it, expect } from 'vitest'
import { detectTable } from '../lib/detectTable'

describe('detectTable', () => {
  const rows = [
    ['Produção Médica'],
    ['Médico', 'Valor'],
    ['Dr A', '100'],
    ['Dr B', '200'],
    ['TOTAL GERAL', '300'],
  ]

  it('pula lixo do topo, acha o cabeçalho e remove totais', () => {
    const t = detectTable(rows)
    expect(t.headerRow).toBe(1)
    expect(t.columns[0].name).toBe('Médico')
    expect(t.data).toHaveLength(2) // total removido
    expect(t.droppedTop).toBe(1)
    expect(t.droppedTotals).toBe(1)
  })

  it('respeita o cabeçalho forçado (correção manual)', () => {
    const t = detectTable(rows, 0)
    expect(t.headerRow).toBe(0)
    expect(t.columns[0].name).toBe('Produção Médica')
    expect(t.data.length).toBeGreaterThan(2)
  })

  it('lida com entrada vazia', () => {
    expect(detectTable([]).columns).toHaveLength(0)
    expect(detectTable(null).data).toHaveLength(0)
  })
})
