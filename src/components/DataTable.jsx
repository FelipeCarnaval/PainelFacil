import { useMemo, useState } from 'react'
import { Table2, Search, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { numOf, dateOf } from '../lib/profile'
import { fmtNum, fmtDate } from '../lib/brFormat'

// Conferência linha a linha dos dados FILTRADOS (não é o Excel original: já vem
// limpa — sem lixo de topo/totais — e reage aos filtros do painel). Como o público
// principal só quer cards e gráficos, começa RECOLHIDA; o Excel exporta direto.
export default function DataTable({ table, profiles, tableState, setTableState, onExport }) {
  const [open, setOpen] = useState(false)
  const cols = profiles.map((p) => p.name)
  const typeOf = useMemo(() => Object.fromEntries(profiles.map((p) => [p.name, p.type])), [profiles])

  const { rows, total, page, pageSize } = table
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const { sort, search } = tableState

  const clickSort = (c) =>
    setTableState((s) => ({ ...s, sort: s.sort.col === c ? { col: c, dir: -s.sort.dir } : { col: c, dir: 1 }, page: 0 }))
  const onSearch = (e) => setTableState((s) => ({ ...s, search: e.target.value, page: 0 }))
  const go = (delta) => setTableState((s) => ({ ...s, page: Math.min(Math.max(0, s.page + delta), pages - 1) }))

  function cell(value, type) {
    if (value == null || value === '') return ''
    if (type === 'number') { const n = numOf(value); return n == null ? String(value) : fmtNum(n) }
    if (type === 'date') { const d = dateOf(value); return d ? fmtDate(d) : String(value) }
    return String(value)
  }

  return (
    <div className="card table-card">
      <div className="table-head">
        <div className="panel-header">
          <span className="panel-icon" style={{ '--panel-grad': 'var(--grad-teal)' }} aria-hidden="true">
            <Table2 size={17} strokeWidth={2.2} />
          </span>
          <div className="panel-heading">
            <h3 className="panel-title">Dados detalhados</h3>
            <p className="panel-subtitle">
              {total.toLocaleString('pt-BR')} linhas filtradas · conferência linha a linha
            </p>
          </div>
        </div>
        <div className="table-actions">
          {open && (
            <div className="search-wrap">
              <Search size={15} className="search-ic" />
              <input className="table-search" placeholder="Buscar na tabela…" value={search} onChange={onSearch} aria-label="Buscar na tabela" />
            </div>
          )}
          <button className="btn sm ghost" onClick={onExport}><Download size={15} /> Exportar Excel</button>
          <button className="btn sm ghost no-print" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {open ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      {open && (
        <>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  {cols.map((c) => {
                    const active = sort.col === c
                    return (
                      <th
                        key={c} scope="col" role="button" tabIndex={0}
                        aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                        onClick={() => clickSort(c)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickSort(c) } }}
                        className={`th-${typeOf[c]} ${active ? 'sorted' : ''}`}
                      >
                        {c} {active ? (sort.dir === 1 ? '▲' : '▼') : ''}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {cols.map((c) => <td key={c} className={typeOf[c] === 'number' ? 'num' : ''}>{cell(row[c], typeOf[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn sm ghost" disabled={page === 0} onClick={() => go(-1)}><ChevronLeft size={15} /> Anterior</button>
            <span>Página {page + 1} de {pages} · {total.toLocaleString('pt-BR')} linhas</span>
            <button className="btn sm ghost" disabled={page >= pages - 1} onClick={() => go(1)}>Próxima <ChevronRight size={15} /></button>
          </div>
        </>
      )}
    </div>
  )
}
