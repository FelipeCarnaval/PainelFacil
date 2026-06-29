// Utilitários para o padrão brasileiro: números (1.234,56) e datas (dd/mm/aaaa).

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Converte texto BR em número. Retorna null se não for número.
export function parseBRNumber(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return null

  let s = String(value).trim()
  if (!s) return null

  const parenNeg = /^\(.*\)$/.test(s) // contabilidade: (123) = -123
  // Remove só ruído conhecido (moeda, %, espaços). NÃO remove '/', ':' nem letras.
  let cleaned = (parenNeg ? s.slice(1, -1) : s)
    .replace(/(r\$|us\$|\$|€|£|%)/gi, '')
    .replace(/\s/g, '')
  // A partir daqui só pode sobrar dígito, separador e sinal — senão não é número
  // (assim "15/03/2025" e "abc" são rejeitados e podem ser tratados como data/texto).
  if (!/^[+-]?[\d.,]+$/.test(cleaned)) return null
  cleaned = cleaned.replace('+', '')
  if (/^[-.,]+$/.test(cleaned)) return null

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  if (hasComma && hasDot) {
    // ponto = milhar, vírgula = decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.')
  } else if (hasDot) {
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts.join('') // 1.234.567 -> milhar
    } else {
      const dec = parts[1] || ''
      // grupo de 3 dígitos com algo antes => milhar (1.234). Senão, decimal (10.5)
      if (dec.length === 3 && parts[0].replace('-', '').length >= 1) cleaned = parts.join('')
    }
  }

  let n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  if (parenNeg) n = -Math.abs(n)
  return n
}

// Converte texto/valor em Date. Retorna null se não for data.
export function parseBRDate(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (value == null || typeof value === 'number') return null

  const s = String(value).trim()
  if (!s) return null

  let m
  // dd/mm/aaaa
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m) {
    let d = +m[1], mo = +m[2], y = +m[3]
    if (y < 100) y += 2000
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo - 1, d)
      if (!isNaN(dt.getTime())) return dt
    }
  }
  // aaaa-mm-dd
  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (m) {
    let y = +m[1], mo = +m[2], d = +m[3]
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo - 1, d)
      if (!isNaN(dt.getTime())) return dt
    }
  }
  // mm/aaaa (competência)
  m = s.match(/^(\d{1,2})[/\-.](\d{4})$/)
  if (m) {
    let mo = +m[1], y = +m[2]
    if (mo >= 1 && mo <= 12) {
      const dt = new Date(y, mo - 1, 1)
      if (!isNaN(dt.getTime())) return dt
    }
  }
  return null
}

export const fmtNum = (n, dec = 2) =>
  n == null || isNaN(n)
    ? '—'
    : n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const fmtInt = (n) =>
  n == null || isNaN(n) ? '—' : Math.round(n).toLocaleString('pt-BR')

export const fmtCompact = (n) => {
  if (n == null || isNaN(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' bi'
  if (a >= 1e6) return (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
  if (a >= 1e3) return (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'
  return fmtNum(n, 0)
}

export const fmtDate = (d) =>
  d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—'

export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return `${MESES[+m - 1]}/${String(y).slice(2)}`
}

const pad2 = (n) => String(n).padStart(2, '0')

// Segunda-feira da semana de uma data (usada como chave de semana — sem o problema
// de "semana ISO" que cruza o ano).
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // segunda = 0
  x.setDate(x.getDate() - dow)
  return x
}

// Escolhe a granularidade temporal conforme o intervalo coberto pelos dados,
// mirando um número legível de pontos no eixo.
export function chooseGranularity(min, max) {
  if (!(min instanceof Date) || !(max instanceof Date) || isNaN(min) || isNaN(max)) return 'month'
  const days = Math.abs(max - min) / 86400000
  if (days <= 45) return 'day'
  if (days <= 182) return 'week'
  if (days <= 731) return 'month'
  if (days <= 2922) return 'quarter'
  return 'year'
}

// Chave ordenável (lexicograficamente cronológica) do período de uma data.
export function periodKey(d, gran) {
  const y = d.getFullYear()
  if (gran === 'day') return `${y}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  if (gran === 'week') {
    const w = weekStart(d)
    return `${w.getFullYear()}-${pad2(w.getMonth() + 1)}-${pad2(w.getDate())}`
  }
  if (gran === 'quarter') return `${y}-${Math.floor(d.getMonth() / 3) + 1}`
  if (gran === 'year') return `${y}`
  return monthKey(d) // month
}

// Rótulo curto (padrão BR) do período.
export function periodLabel(key, gran) {
  if (gran === 'day' || gran === 'week') {
    const [, m, d] = key.split('-')
    return `${d}/${m}`
  }
  if (gran === 'quarter') {
    const [y, q] = key.split('-')
    return `T${q}/${String(y).slice(2)}`
  }
  if (gran === 'year') return key
  return monthLabel(key) // month
}

// Palavra do período para títulos ("por dia", "por semana"…).
export const GRAN_WORD = { day: 'dia', week: 'semana', month: 'mês', quarter: 'trimestre', year: 'ano' }
