import { Settings2, RotateCcw } from 'lucide-react'

const TYPE_LABEL = {
  number: 'Número',
  date: 'Data',
  category: 'Categoria',
  text: 'Texto',
  empty: 'Vazia',
}

// Prévia curta de uma linha crua (para escolher o cabeçalho).
function preview(row) {
  const cells = (row || [])
    .filter((c) => c != null && String(c).trim() !== '')
    .slice(0, 6)
    .map((c) => String(c).trim())
  const s = cells.join('  |  ')
  if (!s) return '(linha vazia)'
  return s.length > 70 ? s.slice(0, 70) + '…' : s
}

export default function OverridePanel({
  preview: previewRows, table, allProfiles, dash, crosstab, overrides, setOverrides, onReset,
}) {
  const excluded = new Set(overrides.excluded)
  const effectivePrimary = overrides.primary ?? dash.primary
  const measureOptions = allProfiles
    .filter((p) => p.type === 'number' && p.stats.agg !== 'avg' && !excluded.has(p.name))
    .map((p) => p.name)

  const headerRows = previewRows || []
  const hasOverrides =
    overrides.headerRow != null ||
    Object.keys(overrides.types).length > 0 ||
    overrides.excluded.length > 0 ||
    overrides.primary != null ||
    overrides.unpivot === 'off'

  // Liga/desliga o "desempilhamento" de tabela cruzada (Fase B). Trocar isso reorganiza
  // as colunas, então zera os overrides por-coluna (que se referem a colunas diferentes).
  const toggleUnpivot = (e) => {
    setOverrides({
      headerRow: overrides.headerRow,
      types: {}, excluded: [], primary: null,
      unpivot: e.target.checked ? 'auto' : 'off',
    })
  }

  // Mudar o cabeçalho renomeia colunas: zera overrides por-coluna para evitar inconsistência.
  const changeHeader = (e) => {
    const val = e.target.value
    setOverrides({ headerRow: val === '' ? null : Number(val), types: {}, excluded: [], primary: null })
  }
  const changeType = (name, val) => {
    const types = { ...overrides.types }
    if (val === 'auto') delete types[name]
    else types[name] = val
    setOverrides({ ...overrides, types })
  }
  const toggleExclude = (name) => {
    const set = new Set(overrides.excluded)
    set.has(name) ? set.delete(name) : set.add(name)
    const primary = name === overrides.primary ? null : overrides.primary
    setOverrides({ ...overrides, excluded: [...set], primary })
  }
  const changePrimary = (e) => {
    const val = e.target.value
    setOverrides({ ...overrides, primary: val === '' ? null : val })
  }

  return (
    <div className="card ov-panel">
      <div className="ov-head">
        <h3><Settings2 size={16} className="chart-ic" /> Ajustar dados</h3>
        <button className="btn ghost sm" onClick={onReset} disabled={!hasOverrides}>
          <RotateCcw size={14} /> Restaurar automático
        </button>
      </div>

      <div className="ov-top">
        <label className="ov-field">
          <span className="ov-field-label">Linha de cabeçalho</span>
          <select value={overrides.headerRow ?? ''} onChange={changeHeader}>
            <option value="">Automático (linha {table.headerRow + 1})</option>
            {headerRows.map((r, i) => (
              <option key={i} value={i}>Linha {i + 1}: {preview(r)}</option>
            ))}
          </select>
        </label>

        <label className="ov-field">
          <span className="ov-field-label">Medida principal (gráficos)</span>
          <select value={overrides.primary ?? ''} onChange={changePrimary}>
            <option value="">Automático{dash.primary ? ` (${dash.primary})` : ''}</option>
            {measureOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      {crosstab?.available && (
        <label className="ov-crosstab">
          <input type="checkbox" checked={overrides.unpivot !== 'off'} onChange={toggleUnpivot} />
          <span>
            <b>Desempilhar tabela cruzada</b> (períodos nas colunas → série temporal).
            {crosstab.applied
              ? ' Detectado e aplicado automaticamente.'
              : ' Detectado — marque para reorganizar.'}
          </span>
        </label>
      )}

      <div className="ov-cols-head">
        <span>Coluna</span>
        <span>Tipo</span>
        <span>Analisar</span>
      </div>
      <div className="ov-cols">
        {allProfiles.map((p) => {
          const isExcluded = excluded.has(p.name)
          return (
            <div key={p.name} className={`ov-col ${isExcluded ? 'is-excluded' : ''}`}>
              <span className="ov-colname" title={`${p.name} — ${TYPE_LABEL[p.type] || p.type}`}>
                {p.name}
                {effectivePrimary === p.name && !isExcluded && <span className="ov-badge">principal</span>}
              </span>
              <select
                className="ov-type"
                value={overrides.types[p.name] || 'auto'}
                onChange={(e) => changeType(p.name, e.target.value)}
                aria-label={`Tipo da coluna ${p.name}`}
              >
                <option value="auto">Automático ({TYPE_LABEL[p.type] || p.type})</option>
                <option value="number">Número</option>
                <option value="date">Data</option>
                <option value="category">Categoria</option>
                <option value="text">Texto</option>
              </select>
              <label className="ov-check" title={isExcluded ? 'Incluir na análise' : 'Excluir da análise'}>
                <input
                  type="checkbox"
                  checked={!isExcluded}
                  onChange={() => toggleExclude(p.name)}
                  aria-label={`Analisar coluna ${p.name}`}
                />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
