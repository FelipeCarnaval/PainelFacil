import * as XLSX from 'xlsx'

const isCsv = (file) => /\.csv$/i.test(file.name || '') || file.type === 'text/csv'

// Decodifica bytes de CSV respeitando a codificação. Relatórios do Benner/MV costumam
// exportar em Windows-1252 (Latin1); ler como UTF-8 quebra acentos ("Convênio" -> "Conv?nio").
function decodeCsv(buf) {
  const bytes = new Uint8Array(buf)
  // BOM UTF-8 explícito.
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  // Tenta UTF-8 estrito; se houver byte inválido, é Latin1/Windows-1252.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

// Lê um ArrayBuffer (.xlsx, .xls, .csv) e devolve as abas como matrizes de células.
// SÍNCRONA e sem dependência de `File` — usável tanto na UI thread quanto num Web Worker.
// `nameOrIsCsv`: o nome do arquivo (para detectar .csv) ou um boolean explícito.
export function readWorkbookBuffer(buf, nameOrIsCsv) {
  const csv = typeof nameOrIsCsv === 'boolean' ? nameOrIsCsv : /\.csv$/i.test(nameOrIsCsv || '')
  // CSV: raw:true mantém as células como TEXTO, senão o SheetJS interpreta números no
  // padrão US e corrompe valores BR ("1.549,35" -> 1.54935). Nosso parseBRNumber/parseBRDate
  // cuida da conversão depois, no perfilamento.
  const wb = csv
    ? XLSX.read(decodeCsv(buf), { type: 'string', raw: true })
    : XLSX.read(buf, { type: 'array', cellDates: true })
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })
    return { name, rows }
  }).filter((s) => s.rows.length > 0)
}

// Lê um arquivo (.xlsx, .xls, .csv) e devolve as abas como matrizes de células.
export async function readWorkbook(file) {
  const buf = await file.arrayBuffer()
  return readWorkbookBuffer(buf, isCsv(file))
}

// Exporta um array de objetos para um arquivo Excel.
export function exportToExcel(rows, filename = 'painel.xlsx', sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
