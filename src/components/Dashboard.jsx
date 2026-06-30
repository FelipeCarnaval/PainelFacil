import { lazy, Suspense } from 'react'
import KpiCard from './KpiCard'
import PivotMatrix from './PivotMatrix'
import DataTable from './DataTable'

// recharts (~400 KB) entra num chunk separado, carregado só quando há gráfico para mostrar.
const ChartWidget = lazy(() => import('./ChartWidget'))

// Componente "burro": só renderiza a visão pré-calculada pelo worker (KPIs, séries dos
// gráficos, matriz e página da tabela). Nenhum cálculo pesado aqui.
export default function Dashboard({ view, profiles, tableState, setTableState, onExport, onDrill }) {
  const charts = view.charts.filter((c) => c.type !== 'pivot')
  const pivots = view.charts.filter((c) => c.type === 'pivot')

  return (
    <div className="dashboard">
      {view.kpis.length > 0 && (
        <div className="kpi-row">
          {view.kpis.map((k, i) => <KpiCard key={i} index={i} {...k} />)}
        </div>
      )}

      {charts.length > 0 && (
        <div className="chart-grid">
          <Suspense fallback={<div className="card chart-card"><div className="empty-chart">Carregando gráficos…</div></div>}>
            {charts.map((c, i) => <ChartWidget key={i} chart={c} onDrill={onDrill} />)}
          </Suspense>
        </div>
      )}

      {pivots.map((c, i) => <PivotMatrix key={i} chart={c} />)}

      <DataTable
        table={view.table}
        profiles={profiles}
        tableState={tableState}
        setTableState={setTableState}
        onExport={onExport}
      />
    </div>
  )
}
