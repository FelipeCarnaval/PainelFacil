// Utilitários compartilhados.

// Normaliza um valor de célula para uma chave de agrupamento/filtro estável.
export const keyOf = (v) => {
  const s = v == null ? '' : String(v).trim()
  return s === '' ? '(vazio)' : s
}

// true só para um Date realmente válido.
export const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime())
