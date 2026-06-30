// Esqueleto animado mostrado enquanto a visão é calculada — mais moderno que um spinner.
export default function DashboardSkeleton() {
  return (
    <div className="dashboard sk-dash" aria-hidden="true">
      <div className="kpi-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="kpi sk-kpi" key={i}>
            <div className="sk sk-ic" />
            <div className="sk sk-num" />
            <div className="sk sk-lbl" />
            <div className="sk sk-spark" />
          </div>
        ))}
      </div>
      <div className="chart-grid">
        {Array.from({ length: 2 }).map((_, i) => (
          <div className="card sk-chart" key={i}>
            <div className="sk sk-title" />
            <div className="sk sk-plot" />
          </div>
        ))}
      </div>
    </div>
  )
}
