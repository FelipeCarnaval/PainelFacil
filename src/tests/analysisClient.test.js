import { describe, it, expect } from 'vitest'
import { loadRows, analyze, view, exportRows, release } from '../services/analysisClient'

// Sem `Worker` global no ambiente de teste → exercita o caminho SÍNCRONO (engine na thread).
describe('analysisClient — análise, visão e cache', () => {
  const rows = [
    ['Relatório'],
    ['Convênio', 'Valor'],
    ['Unimed', '100'],
    ['Amil', '200'],
    ['Unimed', '300'],
  ]

  it('analyze devolve meta (sem dados crus) e memoiza', async () => {
    const { token } = await loadRows(rows)
    const meta = await analyze(token, 0, {})
    expect(meta.rowCount).toBe(3)
    expect(meta.dash).toBeTruthy()
    expect(meta.table).toBeUndefined() // não trafega os dados
    expect(meta.dimOptions['Convênio']).toContain('Unimed')
    const again = await analyze(token, 0, {})
    expect(again).toBe(meta) // cache de meta
    release(token)
  })

  it('view: cache HIT, MISS e exportRows', async () => {
    const { token } = await loadRows(rows)
    await analyze(token, 0, {})

    const v1 = await view(token, 0, {}, {}, {})
    expect(v1.count).toBe(3)
    expect(v1.cached).toBeFalsy() // miss

    const v2 = await view(token, 0, {}, {}, {})
    expect(v2.cached).toBe(true) // hit

    const vf = await view(token, 0, {}, { dims: { 'Convênio': ['Unimed'] } }, {})
    expect(vf.cached).toBeFalsy() // miss (filtro novo)
    expect(vf.count).toBe(2) // 2 linhas Unimed

    const all = await exportRows(token, 0, {}, {}, {})
    expect(all).toHaveLength(3)
    release(token)
  })

  it('invalidação: mudar overrides gera nova análise/visão', async () => {
    const { token } = await loadRows(rows)
    await analyze(token, 0, {})
    const base = await view(token, 0, {}, {}, {})

    // exclui a coluna Valor → muda a chave de análise → engine/visão diferentes
    await analyze(token, 0, { excluded: ['Valor'] })
    const changed = await view(token, 0, { excluded: ['Valor'] }, {}, {})
    expect(changed).not.toBe(base)
    release(token)
  })
})
