import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { readWorkbookBuffer } from '../lib/parseFile'

describe('readWorkbookBuffer — CSV', () => {
  it('decodifica Latin1 e preserva números BR como texto (não corrompe)', () => {
    const csv = 'Médico;Valor\r\nDr A;1.234,56\r\nDr B;200,00'
    const buf = Buffer.from(csv, 'latin1') // simula export Windows-1252 do Benner/MV
    const sheets = readWorkbookBuffer(buf, true)
    const rows = sheets[0].rows
    expect(rows[0][0]).toBe('Médico') // acento decodificado
    expect(rows[1]).toEqual(['Dr A', '1.234,56']) // string preservada, NÃO 1.54956
  })

  it('detecta CSV pelo nome do arquivo', () => {
    const buf = Buffer.from('a;b\n1;2', 'utf-8')
    const sheets = readWorkbookBuffer(buf, 'dados.csv')
    expect(sheets[0].rows[0]).toEqual(['a', 'b'])
  })
})

describe('readWorkbookBuffer — XLSX', () => {
  it('lê uma planilha Excel a partir do buffer', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Col', 'Num'], ['x', 10], ['y', 20]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plan1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const sheets = readWorkbookBuffer(buf, false)
    expect(sheets[0].name).toBe('Plan1')
    expect(sheets[0].rows[0]).toEqual(['Col', 'Num'])
    expect(sheets[0].rows[1][1]).toBe(10)
  })
})
