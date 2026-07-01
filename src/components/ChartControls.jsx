// Controles globais dos gráficos: quantos itens mostrar no ranking (Top N) e a
// granularidade da série temporal. Recalculam a visão (no worker) ao mudar.
export default function ChartControls({ opts, setOpts, showTopN, hasDate }) {
  if (!showTopN && !hasDate) return null
  return (
    <div className="chart-controls no-print">
      {showTopN && (
        <label className="cc-item">
          <span>Mostrar top</span>
          <select
            value={opts.topN}
            onChange={(e) => setOpts((o) => ({ ...o, topN: Number(e.target.value) }))}
            aria-label="Quantidade de itens no ranking (Top N)"
          >
            {[5, 10, 15, 25].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      {hasDate && (
        <label className="cc-item">
          <span>Período</span>
          <select
            value={opts.gran}
            onChange={(e) => setOpts((o) => ({ ...o, gran: e.target.value }))}
            aria-label="Granularidade da série temporal"
          >
            <option value="auto">Automático</option>
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Ano</option>
          </select>
        </label>
      )}
    </div>
  )
}
