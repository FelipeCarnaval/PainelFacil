// Persistência LOCAL apenas da CONFIGURAÇÃO de um arquivo (os "overrides" de ajuste manual).
// NUNCA grava linhas/dados — só preferências de leitura — preservando o compromisso LGPD
// ("dados de paciente nunca saem do navegador, nem para o disco"). Assim, ao reabrir o
// MESMO relatório, os ajustes (cabeçalho, tipos, medida, desempilhamento) voltam prontos.

const PREFIX = 'pf-ovr:'
// Whitelist explícita: somente estes campos de configuração podem ser persistidos.
const FIELDS = ['headerRow', 'types', 'excluded', 'primary', 'unpivot']

// Chave por arquivo: nome + tamanho + aba (evita colidir relatórios diferentes).
export function configKey(fileName, fileSize, sheetIndex) {
  return `${PREFIX}${fileName}|${fileSize}|${sheetIndex}`
}

const isDefault = (field, v) => {
  if (v == null) return true
  if (field === 'types') return Object.keys(v).length === 0
  if (field === 'excluded') return v.length === 0
  if (field === 'unpivot') return v === 'auto'
  return false
}

// Reduz os overrides ao subconjunto não-default e dentro da whitelist.
function pick(overrides) {
  const out = {}
  for (const f of FIELDS) if (!isDefault(f, overrides[f])) out[f] = overrides[f]
  return out
}

export function loadOverrides(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw)
    const out = pick(obj) // re-filtra: ignora qualquer campo fora da whitelist
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

export function saveOverrides(key, overrides) {
  try {
    const out = pick(overrides)
    if (Object.keys(out).length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(out))
  } catch {
    /* localStorage indisponível (modo privado/quota) — persistência é só conveniência */
  }
}
