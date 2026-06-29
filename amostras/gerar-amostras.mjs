// Gera 3 arquivos de teste simulando os sistemas do hospital, com as armadilhas
// típicas (cabeçalho com lixo no topo, totais, alta cardinalidade, %, datas BR,
// Latin1, e um relatório já cruzado). Rode: node amostras/gerar-amostras.mjs
import * as XLSX from 'xlsx'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))
const out = (f) => join(DIR, f)
const pick = (a, i) => a[i % a.length]
const rnd = (n) => Math.floor(Math.random() * n)
const money = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ---------------------------------------------------------------------------
// 1) BENNER SAÚDE — CSV (Latin1), cabeçalho de 2 linhas, 90 médicos, totais, R$ BR
// ---------------------------------------------------------------------------
function bennerSaude() {
  const primeiros = ['João', 'Antônio', 'Sérgio', 'Mônica', 'Conceição', 'Cláudia', 'Régis', 'Tâmara',
    'Vinícius', 'Verônica', 'Otávio', 'Inês', 'Fábio', 'Letícia', 'Gonçalo', 'Cecília']
  const sobren = ['Gonçalves', 'Assunção', 'Câmara', 'Brandão', 'Façanha', 'Magalhães', 'Sá', 'Néri',
    'Bittencourt', 'Vasconcelos', 'Üzun', 'Português']
  const medicos = []
  const seen = new Set()
  let k = 0
  while (medicos.length < 90) {
    const t = medicos.length % 2 ? 'Dr.' : 'Dra.'
    const nome = `${t} ${primeiros[k % primeiros.length]} ${sobren[Math.floor(k / primeiros.length) % sobren.length]}`
    if (!seen.has(nome)) { seen.add(nome); medicos.push(nome) }
    k++
  }
  const procs = ['Consulta', 'Cirurgia', 'Ultrassonografia', 'Raio-X', 'Tomografia',
    'Ressonância', 'Endoscopia', 'Avaliação Pré-Anestésica']

  const rows = []
  rows.push(['Produção Médica — Hospital São Cristóvão (Benner Saúde)']) // linha 1: título (lixo)
  rows.push(['Médico', 'Procedimento', 'Data', 'Quantidade', 'Valor Apresentado', 'Glosa', 'Valor Pago']) // linha 2: cabeçalho real

  let ta = 0, tg = 0, tp = 0
  for (let i = 0; i < 420; i++) {
    const dia = 1 + rnd(28)
    const data = `${String(dia).padStart(2, '0')}/03/2025` // mês único => testa granularidade DIÁRIA
    const qtd = 1 + rnd(8)
    const apres = +(80 + Math.random() * 1500).toFixed(2) * qtd
    const glosa = +(apres * Math.random() * 0.18).toFixed(2)
    const pago = +(apres - glosa).toFixed(2)
    ta += apres; tg += glosa; tp += pago
    rows.push([pick(medicos, rnd(90)), pick(procs, rnd(8)), data, qtd, money(apres), money(glosa), money(pago)])
  }
  rows.push(['Subtotal Março', '', '', '', money(ta), money(tg), money(tp)]) // total (deve sumir)
  rows.push(['TOTAL GERAL', '', '', '', money(ta), money(tg), money(tp)])     // total (deve sumir)

  // CSV com ; (padrão BR) e aspas quando há ; no texto
  const csv = rows.map((r) => r.map((c) => {
    const s = c == null ? '' : String(c)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(';')).join('\r\n')
  writeFileSync(out('1_benner_saude_producao.csv'), Buffer.from(csv, 'latin1')) // Latin1/Windows-1252
  return medicos.length
}

// ---------------------------------------------------------------------------
// 2) BENNER CORPORATIVO — XLSX, 1 cabeçalho, 3 anos (=> trimestral), Taxa %, total
// ---------------------------------------------------------------------------
function bennerCorporativo() {
  const convenios = ['Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Hapvida', 'Particular']
  const aoa = [['Competência', 'Convênio', 'Valor Apresentado', 'Valor Glosado', 'Valor Pago', 'Taxa de Ocupação', 'Quantidade']]
  let ta = 0, tg = 0, tp = 0, tq = 0
  for (let y = 2023; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const conv of convenios) {
        const apres = +(50000 + Math.random() * 200000).toFixed(2)
        const glosa = +(apres * (0.05 + Math.random() * 0.12)).toFixed(2)
        const pago = +(apres - glosa).toFixed(2)
        const qtd = 200 + rnd(1500)
        const taxa = (60 + Math.random() * 35).toFixed(1).replace('.', ',') + '%'
        ta += apres; tg += glosa; tp += pago; tq += qtd
        aoa.push([`${String(m).padStart(2, '0')}/${y}`, conv, apres, glosa, pago, taxa, qtd])
      }
    }
  }
  aoa.push(['TOTAL', '', +ta.toFixed(2), +tg.toFixed(2), +tp.toFixed(2), '', tq]) // total (deve sumir)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Financeiro')
  XLSX.writeFile(wb, out('2_benner_corporativo_financeiro.xlsx'))
  return aoa.length - 2
}

// ---------------------------------------------------------------------------
// 3) SOUL MV — XLSX já PIVOTADO (cross-tab): colunas = meses, linhas = setores,
//    com células mescladas no topo. É o caso que a heurística NÃO resolve sozinha.
// ---------------------------------------------------------------------------
function soulMV() {
  const meses = ['jan/2025', 'fev/2025', 'mar/2025', 'abr/2025', 'mai/2025', 'jun/2025',
    'jul/2025', 'ago/2025', 'set/2025', 'out/2025', 'nov/2025', 'dez/2025']
  const setores = ['Pronto Socorro', 'UTI Adulto', 'UTI Neonatal', 'Centro Cirúrgico', 'Internação',
    'Ambulatório', 'Laboratório', 'Radiologia', 'Farmácia', 'Hemodiálise']
  const aoa = []
  aoa.push(['Atendimentos por Setor — Soul MV']) // linha 1: título mesclado
  aoa.push(['Competência: Exercício 2025']) // linha 2: subtítulo mesclado
  aoa.push(['Setor', ...meses]) // linha 3: cabeçalho real
  for (const s of setores) {
    const base = 200 + rnd(2000)
    aoa.push([s, ...meses.map(() => base + rnd(800))])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const last = meses.length // índice da última coluna (0 = Setor)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: last } }, // título mesclado em toda a largura
    { s: { r: 1, c: 0 }, e: { r: 1, c: last } }, // subtítulo mesclado
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos')
  XLSX.writeFile(wb, out('3_soul_mv_cruzado.xlsx'))
  return setores.length
}

const m = bennerSaude()
const c = bennerCorporativo()
const s = soulMV()
console.log('Gerados em amostras/:')
console.log(`  1_benner_saude_producao.csv        (Latin1, 2 linhas de cabeçalho, ${m} médicos, 420 linhas + 2 totais)`)
console.log(`  2_benner_corporativo_financeiro.xlsx (1 cabeçalho, ${c} linhas, 3 anos, Taxa %, 1 total)`)
console.log(`  3_soul_mv_cruzado.xlsx               (cross-tab, células mescladas, ${s} setores x 12 meses)`)
