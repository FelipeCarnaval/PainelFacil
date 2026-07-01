import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutDashboard, Moon, Sun, Plus, AlertTriangle, Settings2, Gauge, Loader2, Printer, ClipboardList, Check } from 'lucide-react'
import * as engine from './services/analysisClient'
import { buildSummary } from './lib/summary'
import { useDataset } from './hooks/useDataset'
import Dropzone from './components/Dropzone'
import SheetPicker from './components/SheetPicker'
import FilterBar from './components/FilterBar'
import ActiveFilters from './components/ActiveFilters'
import ChartControls from './components/ChartControls'
import OverridePanel from './components/OverridePanel'
import Dashboard from './components/Dashboard'
import DashboardSkeleton from './components/DashboardSkeleton'
import PerfPanel from './components/PerfPanel'
import ErrorBoundary from './components/ErrorBoundary'

const defaultTableState = () => ({ sort: { col: null, dir: 1 }, search: '', page: 0 })

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pf-theme') || 'light')
  const [showPanel, setShowPanel] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [dimFilters, setDimFilters] = useState({})
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [tableState, setTableState] = useState(defaultTableState())
  const [chartOpts, setChartOpts] = useState({ topN: 10, gran: 'auto' })
  const [view, setView] = useState(null)
  const [copied, setCopied] = useState(false)
  const [viewBusy, setViewBusy] = useState(false)
  const [viewError, setViewError] = useState(null)
  const [perf, setPerf] = useState(null)
  const viewSeq = useRef(0)

  const ds = useDataset()
  const { stage, error, fileName, fileBase, sheets, overrides, setOverrides, meta, busy, token, sheetIndex } = ds

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pf-theme', theme)
  }, [theme])

  // Filtros/tabela referem-se a colunas; ao mudar overrides, zera tudo.
  useEffect(() => {
    setDimFilters({})
    setDateFrom(null)
    setDateTo(null)
    setTableState(defaultTableState())
  }, [overrides])

  const filters = useMemo(
    () => ({
      dims: Object.fromEntries(
        Object.entries(dimFilters).filter(([, s]) => s && s.size).map(([k, s]) => [k, [...s]]),
      ),
      dateCol: meta?.dash.dateCol ?? null,
      dateFrom: dateFrom ? dateFrom.getTime() : null,
      dateTo: dateTo ? dateTo.getTime() : null,
    }),
    [dimFilters, dateFrom, dateTo, meta],
  )

  // Opções dos gráficos (Top N / granularidade) que também recalculam a visão.
  const viewOpts = useMemo(
    () => ({ topN: chartOpts.topN, gran: chartOpts.gran === 'auto' ? null : chartOpts.gran }),
    [chartOpts],
  )

  // Pede a VISÃO (filtros + agregações + tabela) ao worker — fora da UI thread.
  useEffect(() => {
    if (!meta || meta.rowCount === 0) { setView(null); return }
    const my = ++viewSeq.current
    let cancelled = false
    setViewBusy(true)
    setViewError(null)
    engine
      .view(token, sheetIndex, overrides, filters, tableState, viewOpts)
      .then((v) => {
        if (cancelled || my !== viewSeq.current) return
        setView(v)
        setPerf({ ...v.timings, cached: !!v.cached, analyzeMs: meta.analyzeMs, rows: meta.rowCount })
      })
      .catch((e) => {
        if (cancelled || my !== viewSeq.current) return
        setViewError(e?.message || 'Falha ao calcular o painel.')
      })
      .finally(() => { if (!cancelled && my === viewSeq.current) setViewBusy(false) })
    return () => { cancelled = true }
  }, [meta, filters, tableState, token, sheetIndex, overrides, viewOpts])

  function newFile() {
    setShowPanel(false)
    setView(null)
    ds.reset()
  }

  // Drill-down: clicar numa barra/fatia filtra o painel por aquela categoria
  // (clicar de novo no mesmo valor limpa o filtro).
  function drill(dim, value) {
    setDimFilters((prev) => {
      const cur = prev[dim]
      const only = cur && cur.size === 1 && cur.has(value)
      const next = { ...prev }
      if (only) delete next[dim]
      else next[dim] = new Set([value])
      return next
    })
  }

  // Remoção de filtros a partir dos chips de "Filtros ativos".
  function clearFilterValue(dim, value) {
    setDimFilters((prev) => {
      const set = prev[dim]
      if (!set) return prev
      const ns = new Set(set)
      ns.delete(value)
      const next = { ...prev }
      if (ns.size) next[dim] = ns
      else delete next[dim]
      return next
    })
  }
  function clearDate() { setDateFrom(null); setDateTo(null) }
  function clearAllFilters() { setDimFilters({}); setDateFrom(null); setDateTo(null) }

  async function exportExcel() {
    const rows = await engine.exportRows(token, sheetIndex, overrides, filters, tableState)
    const { exportToExcel } = await import('./lib/parseFile') // xlsx sob demanda (fora do bundle inicial)
    exportToExcel(rows, `${(fileName || 'painel').replace(/[^\w.-]+/g, '_')}.xlsx`)
  }

  // Resumo executivo (KPIs + destaques + filtros) para a área de transferência.
  async function copySummary() {
    if (!view) return
    const text = buildSummary({
      fileName, count: view.count, total: meta.rowCount,
      kpis: view.kpis, insights: view.insights,
      dimFilters, dateFrom, dateTo,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Não foi possível copiar automaticamente. Seu navegador pode estar bloqueando o acesso à área de transferência.')
    }
  }

  const showNewBtn = stage !== 'idle' && stage !== 'loading'
  const working = busy || viewBusy

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo"><LayoutDashboard size={20} strokeWidth={2.2} /></span>
          <div>
            <strong>PainelFácil</strong>
            <span className="tagline">dashboards automáticos a partir de qualquer planilha</span>
          </div>
        </div>
        <div className="topbar-actions">
          {showNewBtn && (
            <button className="btn ghost" onClick={newFile}>
              <Plus size={16} strokeWidth={2.4} /> Novo arquivo
            </button>
          )}
          <button
            className="btn icon" title="Alternar tema" aria-label="Alternar tema claro/escuro"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <main className="content">
        {stage === 'idle' && (
          <div className="hero">
            <h1>Solte sua planilha. O painel aparece sozinho.</h1>
            <p className="sub">
              Suba um <b>Excel</b> ou <b>CSV</b> (relatórios do Benner, MV, etc.) e o PainelFácil
              detecta as colunas e monta <b>cards, gráficos, matriz e tabela</b> automaticamente.
              100% no seu navegador — nada é enviado para a internet.
            </p>
            <Dropzone onFile={ds.handleFile} onExample={ds.useExample} />
          </div>
        )}

        {stage === 'loading' && (
          <div className="state-center"><div className="spinner" /><p>Lendo o arquivo…</p></div>
        )}

        {stage === 'pick' && (
          <SheetPicker sheets={sheets} fileName={fileBase} onPick={(i) => ds.pickSheet(i)} onCancel={newFile} />
        )}

        {stage === 'error' && (
          <div className="state-center">
            <p className="error-msg"><AlertTriangle size={18} /> {error}</p>
            <button className="btn" onClick={newFile}>Tentar outro arquivo</button>
          </div>
        )}

        {stage === 'analyzing' && !meta && <DashboardSkeleton />}

        {meta && stage !== 'error' && (
          <div className={working ? 'is-busy' : ''}>
            <div className="info-bar">
              <div>
                <span className="info-file">{fileName}</span>
                <span className="info-meta">
                  {(view ? view.count : meta.rowCount).toLocaleString('pt-BR')} de {meta.rowCount.toLocaleString('pt-BR')} registros
                  {meta.headerRows > 1 && ` · cabeçalho de ${meta.headerRows} linhas combinado`}
                  {meta.droppedTop > 0 && ` · ${meta.droppedTop} linha(s) de topo ignoradas`}
                  {meta.droppedTotals > 0 && ` · ${meta.droppedTotals} linha(s) de total removidas`}
                  {working && <span className="busy-badge" role="status"><Loader2 size={13} className="spin" /> atualizando…</span>}
                </span>
              </div>
              <div className="info-actions no-print">
                <div className="type-chips">
                  {meta.profiles.map((p) => (
                    <span key={p.name} className={`chip chip-${p.type}`} title={`${p.name} — ${p.type}`}>{p.name}</span>
                  ))}
                </div>
                {meta.rowCount > 0 && (
                  <>
                    <button
                      className={`btn ghost sm ${copied ? 'active' : ''}`} onClick={copySummary} disabled={!view}
                      title="Copiar resumo executivo (KPIs + destaques) para colar em e-mail ou mensagem"
                    >
                      {copied ? <Check size={15} /> : <ClipboardList size={15} />} {copied ? 'Copiado!' : 'Copiar resumo'}
                    </button>
                    <button className="btn ghost sm" onClick={() => window.print()} title="Imprimir ou salvar o painel em PDF">
                      <Printer size={15} /> PDF
                    </button>
                  </>
                )}
                <button className={`btn ghost sm ${showPerf ? 'active' : ''}`} aria-expanded={showPerf} onClick={() => setShowPerf((v) => !v)}>
                  <Gauge size={15} /> Desempenho
                </button>
                <button className={`btn ghost sm ${showPanel ? 'active' : ''}`} aria-expanded={showPanel} onClick={() => setShowPanel((v) => !v)}>
                  <Settings2 size={15} /> Ajustar dados
                </button>
              </div>
            </div>

            {meta.crosstab?.applied && (
              <div className="notice notice-info">
                <Settings2 size={16} /> Detectamos uma <b>tabela cruzada</b> ({meta.crosstab.periods} períodos nas
                colunas). Reorganizamos para <b>{meta.crosstab.dateName}</b> × <b>{meta.crosstab.valueName}</b> para
                montar a série temporal. Pode desfazer em <b>“Ajustar dados”</b>.
              </div>
            )}

            {showPerf && <div className="no-print"><PerfPanel perf={perf} /></div>}

            {showPanel && (
              <div className="no-print">
                <OverridePanel
                  preview={meta.preview} table={{ headerRow: meta.headerRow }} allProfiles={meta.allProfiles}
                  dash={meta.dash} crosstab={meta.crosstab} overrides={overrides} setOverrides={setOverrides}
                  onReset={() => setOverrides({ headerRow: null, types: {}, excluded: [], primary: null })}
                />
              </div>
            )}

            {meta.rowCount === 0 ? (
              <div className="notice">
                <AlertTriangle size={16} /> Nenhuma linha de dados com esta configuração. Ajuste a
                <b> linha de cabeçalho</b> em “Ajustar dados”.
              </div>
            ) : (
              <>
                <div className="no-print">
                  <FilterBar
                    dims={meta.dash.dims} dateCol={meta.dash.dateCol} dimOptions={meta.dimOptions}
                    dimFilters={dimFilters} setDimFilters={setDimFilters}
                    dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo}
                  />
                  <ActiveFilters
                    dimFilters={dimFilters} dateFrom={dateFrom} dateTo={dateTo} dateCol={meta.dash.dateCol}
                    onClearValue={clearFilterValue} onClearDate={clearDate} onClearAll={clearAllFilters}
                  />
                  <ChartControls
                    opts={chartOpts} setOpts={setChartOpts}
                    showTopN={meta.dash.widgets.some((w) => ['bar', 'bars', 'pie'].includes(w.type))}
                    hasDate={!!meta.dash.dateCol}
                  />
                </div>
                {viewError ? (
                  <div className="notice notice-error">
                    <AlertTriangle size={16} /> Não foi possível calcular o painel: {viewError}
                    <button className="btn ghost sm" onClick={() => setTableState(defaultTableState())}>
                      Reverter ajustes da tabela
                    </button>
                  </div>
                ) : view ? (
                  <ErrorBoundary resetKey={token + '|' + JSON.stringify(overrides)}>
                    <Dashboard
                      view={view} profiles={meta.profiles} tableState={tableState}
                      setTableState={setTableState} onExport={exportExcel} onDrill={drill}
                    />
                  </ErrorBoundary>
                ) : (
                  <DashboardSkeleton />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="foot no-print">PainelFácil · processamento 100% local · feito para testar em casa</footer>
    </div>
  )
}
