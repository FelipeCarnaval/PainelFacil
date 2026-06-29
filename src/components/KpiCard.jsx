import { DollarSign, FileSpreadsheet, Activity, Percent, Sigma } from 'lucide-react'
import { fmtInt, fmtCompact, fmtNum } from '../lib/brFormat'

const MONEY_RX = /valor|vlr|r\$|receita|custo|despesa|glosa|pago|faturad|apresentad|repasse|montante|saldo/i

function iconFor({ agg, measure = '', percent }) {
  if (agg === 'count') return FileSpreadsheet // "Registros" = linhas da planilha
  if (percent) return Percent
  if (agg === 'avg') return Activity
  return MONEY_RX.test(measure) ? DollarSign : Sigma
}

export default function KpiCard({ label, value, kind, agg, measure, percent }) {
  const Icon = iconFor({ agg, measure, percent })
  const num =
    kind === 'int' ? fmtInt(value) : Math.abs(value) >= 10000 ? fmtCompact(value) : fmtNum(value)
  const display = percent ? `${num}%` : num
  return (
    <div className="kpi">
      <span className="kpi-ic"><Icon size={18} strokeWidth={2.2} /></span>
      <div className="kpi-value">{display}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}
