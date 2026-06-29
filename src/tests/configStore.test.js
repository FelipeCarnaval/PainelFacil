import { describe, it, expect, beforeEach } from 'vitest'
import { configKey, loadOverrides, saveOverrides } from '../lib/configStore'

// Mock simples de localStorage (ambiente de teste é 'node').
beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
})

describe('configStore (persistência só de configuração)', () => {
  const key = configKey('relatorio.xlsx', 12345, 0)

  it('salva e recarrega apenas os campos de configuração', () => {
    saveOverrides(key, {
      headerRow: 2, types: { Convênio: 'text' }, excluded: ['Glosa'],
      primary: 'Valor Pago', unpivot: 'off',
    })
    expect(loadOverrides(key)).toEqual({
      headerRow: 2, types: { Convênio: 'text' }, excluded: ['Glosa'],
      primary: 'Valor Pago', unpivot: 'off',
    })
  })

  it('NUNCA persiste dados/linhas, mesmo se forem passados junto', () => {
    saveOverrides(key, { headerRow: 1, data: [{ paciente: 'João' }], rows: [[1, 2]], primary: 'X' })
    const raw = localStorage.getItem(key)
    expect(raw).not.toContain('paciente')
    expect(raw).not.toContain('João')
    const loaded = loadOverrides(key)
    expect(loaded.data).toBeUndefined()
    expect(loaded.rows).toBeUndefined()
    expect(loaded).toEqual({ headerRow: 1, primary: 'X' })
  })

  it('não grava nada quando a config é toda default (e limpa entrada antiga)', () => {
    saveOverrides(key, { headerRow: 5 })
    expect(loadOverrides(key)).toEqual({ headerRow: 5 })
    saveOverrides(key, { headerRow: null, types: {}, excluded: [], primary: null, unpivot: 'auto' })
    expect(localStorage.getItem(key)).toBeNull()
    expect(loadOverrides(key)).toBeNull()
  })

  it('tolera ausência de localStorage sem lançar', () => {
    delete globalThis.localStorage
    expect(() => saveOverrides(key, { headerRow: 1 })).not.toThrow()
    expect(loadOverrides(key)).toBeNull()
  })
})
