import { X, Filter } from 'lucide-react'
import { fmtDate } from '../lib/brFormat'

// Chips removíveis que mostram (e limpam) os filtros aplicados no momento — útil
// principalmente com o drill-down, que aplica filtros por clique no gráfico.
export default function ActiveFilters({ dimFilters, dateFrom, dateTo, dateCol, onClearValue, onClearDate, onClearAll }) {
  const chips = []
  for (const [dim, set] of Object.entries(dimFilters)) {
    if (set && set.size) {
      for (const v of set) {
        chips.push({ key: `${dim}::${v}`, label: `${dim}: ${v || '(vazio)'}`, onRemove: () => onClearValue(dim, v) })
      }
    }
  }
  if (dateFrom || dateTo) {
    const a = dateFrom ? fmtDate(dateFrom) : '…'
    const b = dateTo ? fmtDate(dateTo) : '…'
    chips.push({ key: '::date', label: `${dateCol || 'Período'}: ${a} – ${b}`, onRemove: onClearDate })
  }
  if (!chips.length) return null

  return (
    <div className="active-filters no-print">
      <span className="af-label"><Filter size={14} /> Filtros ativos</span>
      {chips.map((c) => (
        <button key={c.key} className="af-chip" onClick={c.onRemove} aria-label={`Remover filtro ${c.label}`}>
          <span className="af-chip-text">{c.label}</span>
          <X size={13} />
        </button>
      ))}
      <button className="af-clear" onClick={onClearAll}>Limpar tudo</button>
    </div>
  )
}
