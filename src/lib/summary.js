// Resumo executivo em texto puro: KPIs + destaques + filtros ativos, pronto para
// colar em e-mail/Teams/WhatsApp. Mesmo conteúdo do painel, redigido como um analista.
import { fmtNum, fmtInt, fmtCompact, fmtDate, periodLabel, GRAN_WORD } from './brFormat'

const MONEY_RX = /valor|vlr|r\$|receita|custo|despesa|glosa|pago|faturad|apresentad|repasse|montante|saldo/i
const pct = (x, dec = 1) => `${(Math.abs(x) * 100).toFixed(dec).replace('.', ',')}%`

// Frase (texto puro) de cada destaque — espelha o InsightsPanel.
export function insightSentence(ins) {
  const word = GRAN_WORD[ins.gran]
  if (ins.type === 'trend') {
    return `${ins.measure} ${ins.delta >= 0 ? 'subiu' : 'caiu'} ${pct(ins.delta)} no último ${word} (${periodLabel(ins.prevKey, ins.gran)} → ${periodLabel(ins.lastKey, ins.gran)}).`
  }
  if (ins.type === 'vsavg') {
    return `O último ${word} (${periodLabel(ins.lastKey, ins.gran)}) ficou ${pct(ins.delta, 0)} ${ins.delta >= 0 ? 'acima' : 'abaixo'} da média dos ${ins.periods} anteriores em ${ins.measure}.`
  }
  if (ins.type === 'mover') {
    return `${ins.key} foi quem mais ${ins.delta >= 0 ? 'cresceu' : 'caiu'} em ${ins.measure}: ${pct(ins.delta, 0)} (${periodLabel(ins.prevKey, ins.gran)} → ${periodLabel(ins.lastKey, ins.gran)}).`
  }
  if (ins.type === 'peak') {
    const share = ins.share != null ? ` (${pct(ins.share, 0)} do total)` : ''
    return `Melhor ${word}: ${periodLabel(ins.periodKey, ins.gran)}, com ${fmtCompact(ins.value)} em ${ins.measure}${share}.`
  }
  if (ins.type === 'concentration') {
    return `${ins.topKey} concentra ${pct(ins.share, 0)} de ${ins.measure} entre ${ins.groupCount} ${ins.dim.toLowerCase()}(s).`
  }
  return null
}

function kpiLine(k) {
  const money = k.agg !== 'count' && !k.percent && MONEY_RX.test(k.measure || '')
  const num = k.kind === 'int' ? fmtInt(k.value) : Math.abs(k.value) >= 10000 ? fmtCompact(k.value) : fmtNum(k.value)
  const val = k.percent ? `${num}%` : money ? `R$ ${num}` : num
  const trend =
    k.trend != null && Number.isFinite(k.trend)
      ? ` (${k.trend >= 0 ? '↑' : '↓'} ${pct(k.trend)} vs período anterior)`
      : ''
  return `• ${k.label}: ${val}${trend}`
}

export function buildSummary({ fileName, count, total, kpis = [], insights = [], dimFilters = {}, dateFrom = null, dateTo = null }) {
  const lines = [`📊 ${fileName || 'Painel'} — resumo executivo (PainelFácil)`]

  const filtros = []
  for (const [dim, set] of Object.entries(dimFilters)) {
    if (set && set.size) filtros.push(`${dim}: ${[...set].join(', ')}`)
  }
  if (dateFrom || dateTo) {
    filtros.push(`período: ${dateFrom ? fmtDate(dateFrom) : '…'} a ${dateTo ? fmtDate(dateTo) : '…'}`)
  }
  lines.push(`${fmtInt(count)} de ${fmtInt(total)} registros${filtros.length ? ` · filtros — ${filtros.join(' · ')}` : ''}`)

  if (kpis.length) {
    lines.push('', 'Indicadores:')
    for (const k of kpis) lines.push(kpiLine(k))
  }
  const sentences = insights.map(insightSentence).filter(Boolean)
  if (sentences.length) {
    lines.push('', 'Destaques:')
    for (const s of sentences) lines.push(`• ${s}`)
  }
  return lines.join('\n')
}
