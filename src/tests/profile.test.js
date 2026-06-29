import { describe, it, expect } from 'vitest'
import { profileColumns } from '../lib/profile'

const cols = (obj) => Object.keys(obj).map((name, index) => ({ index, name }))
const profileOf = (name, values, overrides) => {
  const data = values.map((v) => ({ [name]: v }))
  return profileColumns([{ index: 0, name }], data, overrides)[0]
}

describe('inferência de tipo', () => {
  it('number quando ≥80% parseiam como número', () => {
    expect(profileOf('V', ['1', '2', '3', '4', 'x']).type).toBe('number') // 80%
  })
  it('date quando ≥80% parseiam como data', () => {
    expect(profileOf('D', ['01/03/2025', '02/03/2025', '03/03/2025']).type).toBe('date')
  })
  it('category recupera alta cardinalidade que repete', () => {
    const nomes = Array.from({ length: 240 }, (_, i) => 'Dr ' + (i % 80))
    expect(profileOf('Medico', nomes).type).toBe('category')
    expect(profileOf('Medico', nomes).stats.distinct).toBe(80)
  })
  it('text para quase-único; empty para 100% nulo', () => {
    const obs = Array.from({ length: 100 }, (_, i) => 'comentário ' + i)
    expect(profileOf('Obs', obs).type).toBe('text')
    expect(profileOf('Vazia', [null, null, '', null]).type).toBe('empty')
  })
})

describe('classificação de agregação (soma vs média)', () => {
  it('taxa/% vira avg; valor vira sum', () => {
    expect(profileOf('Taxa de Ocupação', ['60%', '70%', '80%']).stats.agg).toBe('avg')
    expect(profileOf('Taxa de Ocupação', ['60%', '70%', '80%']).stats.isPercent).toBe(true)
    expect(profileOf('Valor Pago', ['100', '200', '300']).stats.agg).toBe('sum')
  })
})

describe('estatísticas sem estouro de pilha', () => {
  it('min/max/sum em 200k linhas', () => {
    const big = Array.from({ length: 200000 }, (_, i) => ({ V: i + 1 }))
    const p = profileColumns([{ index: 0, name: 'V' }], big)[0]
    expect(p.stats.min).toBe(1)
    expect(p.stats.max).toBe(200000)
    expect(p.stats.sum).toBe(20000100000)
  })
})

describe('override de tipo (correção manual)', () => {
  it('força date numa coluna abaixo do limiar e category num número', () => {
    const quando = [
      ...Array.from({ length: 10 }, (_, i) => `${String(i + 1).padStart(2, '0')}/03/2025`),
      ...Array.from({ length: 5 }, () => 'pendente'),
    ]
    expect(profileOf('Quando', quando).type).not.toBe('date')
    const forced = profileOf('Quando', quando, { Quando: 'date' })
    expect(forced.type).toBe('date')
    expect(forced.stats.min).toBeInstanceOf(Date)
    expect(profileOf('Cod', ['1', '1', '2', '2'], { Cod: 'category' }).type).toBe('category')
  })
})
