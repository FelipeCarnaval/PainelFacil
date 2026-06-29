import { describe, it, expect } from 'vitest'
import {
  parseBRNumber, parseBRDate, fmtNum, fmtInt, fmtCompact, fmtDate,
  monthKey, monthLabel, chooseGranularity, periodKey, periodLabel,
} from '../lib/brFormat'

const D = (s) => { const [d, m, y] = s.split('/'); return new Date(+y, +m - 1, +d) }

describe('parseBRNumber', () => {
  it('entende milhar/decimal BR', () => {
    expect(parseBRNumber('1.234,56')).toBeCloseTo(1234.56)
    expect(parseBRNumber('1.234.567')).toBe(1234567)
    expect(parseBRNumber('10,5')).toBeCloseTo(10.5)
    expect(parseBRNumber('1 234,56')).toBeCloseTo(1234.56)
  })
  it('moeda, porcentagem e negativo contábil', () => {
    expect(parseBRNumber('R$ 1.234,56')).toBeCloseTo(1234.56)
    expect(parseBRNumber('12,5%')).toBeCloseTo(12.5)
    expect(parseBRNumber('(1.234,56)')).toBeCloseTo(-1234.56)
    expect(parseBRNumber('-1.234,56')).toBeCloseTo(-1234.56)
  })
  it('rejeita não-números (datas, texto)', () => {
    expect(parseBRNumber('15/03/2025')).toBeNull()
    expect(parseBRNumber('abc')).toBeNull()
    expect(parseBRNumber('')).toBeNull()
    expect(parseBRNumber(null)).toBeNull()
  })
})

describe('parseBRDate', () => {
  it('dd/mm/aaaa, aaaa-mm-dd, mm/aaaa', () => {
    expect(parseBRDate('15/03/2025')).toBeInstanceOf(Date)
    expect(parseBRDate('2025-03-15')).toBeInstanceOf(Date)
    expect(parseBRDate('03/2025')?.getMonth()).toBe(2)
    expect(parseBRDate('15/03/2025 14:30')).toBeInstanceOf(Date)
  })
  it('rejeita texto e número puro', () => {
    expect(parseBRDate('pendente')).toBeNull()
    expect(parseBRDate(2025)).toBeNull()
  })
})

describe('formatadores', () => {
  it('fmtNum / fmtInt / fmtCompact / fmtDate', () => {
    expect(fmtNum(1234.5)).toBe('1.234,50')
    expect(fmtInt(1234.7)).toBe('1.235')
    expect(fmtCompact(1500000)).toMatch(/mi/)
    expect(fmtCompact(2500)).toMatch(/mil/)
    expect(fmtNum(null)).toBe('—')
    expect(fmtDate(D('15/03/2025'))).toBe('15/03/2025')
  })
})

describe('granularidade temporal', () => {
  const span = (a, b) => chooseGranularity(D(a), D(b))
  it('escolhe pela amplitude', () => {
    expect(span('01/01/2025', '10/01/2025')).toBe('day')
    expect(span('01/01/2025', '01/03/2025')).toBe('week')
    expect(span('01/01/2025', '01/11/2025')).toBe('month')
    expect(span('01/01/2023', '01/06/2025')).toBe('quarter')
    expect(span('01/01/2015', '01/01/2025')).toBe('year')
  })
  it('chaves ordenam cronologicamente e rótulos BR', () => {
    expect(periodLabel('2025-2', 'quarter')).toBe('T2/25')
    expect(periodLabel('2025', 'year')).toBe('2025')
    expect(periodLabel('2025-03-17', 'day')).toBe('17/03')
    const qk = ['15/02/2025', '20/11/2024', '10/05/2025'].map((s) => periodKey(D(s), 'quarter')).sort()
    expect(qk).toEqual(['2024-4', '2025-1', '2025-2'])
    expect(monthLabel(monthKey(D('15/03/2025')))).toBe('mar/25')
  })
})
