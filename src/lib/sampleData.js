// Gera uma aba "suja" no estilo de relatório do Benner Saúde / MV:
// títulos no topo, linha em branco, cabeçalho real e uma linha de TOTAL GERAL no fim.
// Serve para demonstrar a limpeza automática (detecção de cabeçalho e remoção de totais).
// Os dados têm cardinalidade alta (dá trabalho ao "Top N" e ao "Outros" da rosca),
// concentração realista (poucos convênios dominam) e tendência de crescimento
// (alimenta os destaques automáticos).

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
// Sorteio enviesado para o começo da lista: gera concentração (ex.: Unimed domina).
const pickSkew = (arr) => arr[Math.floor(Math.pow(Math.random(), 1.7) * arr.length)]
const money = (n) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function sampleSheet() {
  const convenios = [
    'Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Hapvida',
    'Particular', 'NotreDame Intermédica', 'Porto Seguro Saúde', 'Cassi', 'Geap',
  ]
  const especialidades = [
    'Cardiologia', 'Ortopedia', 'Pediatria', 'Clínica Geral', 'Ginecologia', 'Dermatologia',
    'Oftalmologia', 'Neurologia', 'Urologia', 'Endocrinologia', 'Psiquiatria', 'Otorrino',
  ]
  const unidades = ['Matriz', 'Unidade Norte', 'Unidade Sul', 'Unidade Leste', 'Centro Clínico', 'Hospital Dia']
  const procedimentos = [
    'Consulta', 'Retorno', 'Exame Laboratorial', 'Ultrassom', 'Raio-X', 'Tomografia',
    'Ressonância', 'Eletrocardiograma', 'Ecocardiograma', 'Endoscopia', 'Colonoscopia',
    'Fisioterapia', 'Pequena Cirurgia', 'Curativo', 'Vacinação', 'Teste Ergométrico',
  ]

  const rows = []
  // Lixo de cabeçalho (preâmbulo)
  rows.push(['Relatório de Produção Médica — Benner Saúde'])
  rows.push(['Período: 01/01/2025 a 30/06/2025   |   Unidade: Todas'])
  rows.push(['Emitido em ' + new Date().toLocaleDateString('pt-BR')])
  rows.push([])
  // Cabeçalho real
  rows.push([
    'Competência', 'Convênio', 'Especialidade', 'Unidade',
    'Procedimento', 'Quantidade', 'Valor Apresentado', 'Glosa', 'Valor Pago',
  ])

  let totApres = 0
  let totGlosa = 0
  let totPago = 0
  for (let i = 0; i < 260; i++) {
    const mes = 1 + Math.floor(Math.random() * 6)
    const dia = 1 + Math.floor(Math.random() * 27)
    const comp = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/2025`
    const qtd = 1 + Math.floor(Math.random() * 8)
    // Crescimento ao longo dos meses (~7% a.m.) para os destaques terem o que contar.
    const crescimento = 1 + (mes - 1) * 0.07
    const base = +(60 + Math.random() * 900).toFixed(2)
    const apres = +(base * qtd * crescimento).toFixed(2)
    const glosa = +(apres * Math.random() * 0.18).toFixed(2)
    const pago = +(apres - glosa).toFixed(2)
    totApres += apres
    totGlosa += glosa
    totPago += pago
    rows.push([
      comp, pickSkew(convenios), pick(especialidades), pick(unidades),
      pickSkew(procedimentos), qtd, money(apres), money(glosa), money(pago),
    ])
  }
  // Linha de total (deve ser descartada automaticamente)
  rows.push(['TOTAL GERAL', '', '', '', '', '', money(totApres), money(totGlosa), money(totPago)])

  return { name: 'Produção (exemplo)', rows }
}
