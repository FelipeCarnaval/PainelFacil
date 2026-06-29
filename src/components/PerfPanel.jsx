import { Gauge, Cpu, Filter, BarChart3, Table2, Zap } from 'lucide-react'

const ms = (x) => (x == null ? '—' : `${x} ms`)

// Painel de diagnóstico: mostra onde o tempo é gasto (parse/perfil, filtro, agregação,
// tabela) na última operação. Tudo medido no worker, fora da UI thread.
export default function PerfPanel({ perf }) {
  if (!perf) return null
  const items = [
    { icon: Cpu, label: 'Análise (parse + perfil + engine)', value: ms(perf.analyzeMs) },
    { icon: Filter, label: 'Filtro (índices)', value: ms(perf.filterMs) },
    { icon: BarChart3, label: 'Agregações + gráficos', value: ms(perf.aggMs) },
    { icon: Table2, label: 'Tabela (ordenar + paginar)', value: ms(perf.tableMs) },
    { icon: Zap, label: 'Visão (total)', value: ms(perf.totalMs), strong: true },
  ]
  return (
    <div className="card perf-panel">
      <div className="perf-head">
        <h3><Gauge size={16} className="chart-ic" /> Desempenho</h3>
        <span className="perf-meta">
          {perf.rows?.toLocaleString('pt-BR')} linhas · {perf.cached ? 'visão em cache (0 ms)' : 'recalculada'} · 100% no navegador
        </span>
      </div>
      <div className="perf-grid">
        {items.map((it) => (
          <div key={it.label} className={`perf-item ${it.strong ? 'strong' : ''}`}>
            <it.icon size={15} className="chart-ic" />
            <span className="perf-label">{it.label}</span>
            <span className="perf-value">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
