import { describe, it, expect } from 'vitest'
import { groupAgg, groupAggMulti, timeSeries, timeSeriesMulti, pivot } from '../lib/aggregate'

describe('groupAgg', () => {
  const data = [
    { d: 'A', v: 100 }, { d: 'A', v: null }, { d: 'A', v: 200 }, { d: 'B', v: 50 },
  ]
  it('soma e contagem', () => {
    const sum = groupAgg(data, 'd', 'v', 'sum')
    expect(sum.find((r) => r.key === 'A').value).toBe(300)
    expect(sum.find((r) => r.key === 'A').count).toBe(3)
    expect(sum[0].key).toBe('A') // ordena desc
  })
  it('avg ignora nulos (não conta como 0)', () => {
    const avg = groupAgg(data, 'd', 'v', 'avg')
    expect(avg.find((r) => r.key === 'A').value).toBe(150) // (100+200)/2, não /3
  })
})

describe('groupAggMulti', () => {
  it('soma várias medidas por dimensão', () => {
    const data = [
      { c: 'X', a: 10, b: 1 }, { c: 'X', a: 20, b: 2 }, { c: 'Y', a: 5, b: 9 },
    ]
    const res = groupAggMulti(data, 'c', ['a', 'b'])
    const x = res.find((r) => r.key === 'X')
    expect(x.a).toBe(30)
    expect(x.b).toBe(3)
    expect(res[0].key).toBe('X') // ordena pela 1ª medida
  })
})

describe('séries temporais', () => {
  const daily = Array.from({ length: 10 }, (_, i) => ({
    dia: `${String(i + 1).padStart(2, '0')}/03/2025`, v: 100, w: 50,
  }))
  it('timeSeries respeita granularidade', () => {
    expect(timeSeries(daily, 'dia', 'v', 'day')).toHaveLength(10)
    expect(timeSeries(daily, 'dia', 'v', 'week').length).toBeLessThan(10)
  })
  it('timeSeriesMulti devolve várias medidas por período', () => {
    const r = timeSeriesMulti(daily, 'dia', ['v', 'w'], 'day')
    expect(r).toHaveLength(10)
    expect(r[0].v).toBe(100)
    expect(r[0].w).toBe(50)
  })
})

describe('pivot', () => {
  it('monta matriz linha × coluna com totais', () => {
    const data = [
      { r: 'L1', c: 'C1', v: 5 }, { r: 'L1', c: 'C2', v: 3 }, { r: 'L2', c: 'C1', v: 2 },
    ]
    const p = pivot(data, 'r', 'c', 'v')
    expect(p.rows).toContain('L1')
    expect(p.cols).toContain('C1')
    expect(p.max).toBe(5)
    const l1 = p.matrix.find((m) => m.row === 'L1')
    expect(l1.total).toBe(8)
    expect(l1.values).toHaveLength(p.cols.length)
  })
})
