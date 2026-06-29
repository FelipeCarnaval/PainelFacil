import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseBRNumber, parseBRDate, fmtCompact } from '../lib/brFormat'
import { timeSeries, pivot } from '../lib/aggregate'
import { readWorkbook } from '../lib/parseFile'

describe('parseBRNumber — ramos de borda', () => {
  it('decimal vs milhar com ponto', () => {
    expect(parseBRNumber('10.5')).toBeCloseTo(10.5) // decimal
    expect(parseBRNumber('1.234')).toBe(1234) // milhar
  })
  it('sinais e ruído', () => {
    expect(parseBRNumber('+5')).toBe(5)
    expect(parseBRNumber('.,')).toBeNull()
    expect(parseBRNumber('R$ ')).toBeNull()
  })
})

describe('parseBRDate — inválidas', () => {
  it('mês fora do intervalo', () => {
    expect(parseBRDate('15/13/2025')).toBeNull()
    expect(parseBRDate('2025-13-01')).toBeNull()
  })
})

describe('fmtCompact — bilhão', () => {
  it('formata 1,5 bi', () => {
    expect(fmtCompact(1.5e9)).toMatch(/bi/)
  })
})

describe('aggregate — ramos', () => {
  it('timeSeries usa mês por padrão', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ d: `0${i + 1}/03/2025`, v: 10 }))
    expect(timeSeries(data, 'd', 'v')).toHaveLength(1) // mesmo mês => 1 ponto
  })
  it('pivot limita linhas/colunas', () => {
    const data = []
    for (let r = 0; r < 16; r++) for (let c = 0; c < 13; c++) data.push({ r: 'R' + r, c: 'C' + c, v: r + c + 1 })
    const p = pivot(data, 'r', 'c', 'v')
    expect(p.rows.length).toBeLessThanOrEqual(15)
    expect(p.cols.length).toBeLessThanOrEqual(12)
  })
})

describe('readWorkbook — caminho File', () => {
  it('lê um File .xlsx (mock)', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['A'], [1]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'S')
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const file = { name: 'teste.xlsx', type: '', arrayBuffer: async () => u8 }
    const sheets = await readWorkbook(file)
    expect(sheets[0].rows[0]).toEqual(['A'])
  })
})
