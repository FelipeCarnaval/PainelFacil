// Gera uma aba "suja" no estilo de relatório do Benner Saúde / MV:
// títulos no topo, linha em branco, cabeçalho real e uma linha de TOTAL GERAL no fim.
// Serve para demonstrar a limpeza automática (detecção de cabeçalho e remoção de totais).

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const money = (n) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function sampleSheet() {
  const convenios = ['Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Particular', 'Hapvida']
  const especialidades = ['Cardiologia', 'Ortopedia', 'Pediatria', 'Clínica Geral', 'Ginecologia', 'Dermatologia']
  const unidades = ['Matriz', 'Unidade Norte', 'Unidade Sul']
  const procedimentos = ['Consulta', 'Exame Laboratorial', 'Ultrassom', 'Raio-X', 'Cirurgia', 'Retorno']

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
  for (let i = 0; i < 160; i++) {
    const mes = 1 + Math.floor(Math.random() * 6)
    const dia = 1 + Math.floor(Math.random() * 27)
    const comp = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/2025`
    const qtd = 1 + Math.floor(Math.random() * 8)
    const base = +(60 + Math.random() * 900).toFixed(2)
    const apres = +(base * qtd).toFixed(2)
    const glosa = +(apres * Math.random() * 0.18).toFixed(2)
    const pago = +(apres - glosa).toFixed(2)
    totApres += apres
    totGlosa += glosa
    totPago += pago
    rows.push([
      comp, pick(convenios), pick(especialidades), pick(unidades),
      pick(procedimentos), qtd, money(apres), money(glosa), money(pago),
    ])
  }
  // Linha de total (deve ser descartada automaticamente)
  rows.push(['TOTAL GERAL', '', '', '', '', '', money(totApres), money(totGlosa), money(totPago)])

  return { name: 'Produção (exemplo)', rows }
}
