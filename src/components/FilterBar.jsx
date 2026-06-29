import { SlidersHorizontal } from 'lucide-react'
import MultiSelect from './MultiSelect'
import { isValidDate } from '../lib/utils'

const toInput = (d) =>
  isValidDate(d)
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : ''

export default function FilterBar({
  dims, dateCol, dimOptions, dimFilters, setDimFilters, dateFrom, dateTo, setDateFrom, setDateTo,
}) {
  // Até 4 dimensões filtráveis — opções já vêm prontas do worker (não varre 500k aqui).
  const filterDims = (dims || []).slice(0, 4).map((dim) => ({ dim, options: dimOptions?.[dim] || [] }))

  const hasAny = Object.values(dimFilters).some((s) => s && s.size) || dateFrom || dateTo

  if (!filterDims.length && !dateCol) return null

  return (
    <div className="filterbar">
      <span className="filterbar-title"><SlidersHorizontal size={15} /> Filtros</span>
      {filterDims.map(({ dim, options }) => (
        <MultiSelect
          key={dim}
          label={dim}
          options={options}
          selected={dimFilters[dim] || new Set()}
          onChange={(set) => setDimFilters({ ...dimFilters, [dim]: set })}
        />
      ))}
      {dateCol && (
        <div className="date-range">
          <span className="dr-label">{dateCol}:</span>
          <input type="date" aria-label={`${dateCol} de`} value={toInput(dateFrom)}
            onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)} />
          <span>até</span>
          <input type="date" aria-label={`${dateCol} até`} value={toInput(dateTo)}
            onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value + 'T23:59:59') : null)} />
        </div>
      )}
      {hasAny && (
        <button className="btn ghost sm" onClick={() => { setDimFilters({}); setDateFrom(null); setDateTo(null) }}>
          Limpar filtros
        </button>
      )}
    </div>
  )
}
