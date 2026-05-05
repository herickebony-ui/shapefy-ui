// Parser de planilha Excel/CSV usando SheetJS.
// Recebe File (input type=file) e retorna array de objetos com keys = primeira linha.
import * as XLSX from 'xlsx'

/**
 * @param {File} file
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function parseExcelFile(file) {
  if (!file) return []
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  return json.map((row) => normalizeRow(row))
}

// Normaliza headers: trim, lowercase, sem acentos, troca espaços por _
function normalizeRow(row) {
  const out = {}
  Object.entries(row).forEach(([k, v]) => {
    const key = String(k)
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
    const val = typeof v === 'string' ? v.trim() : v
    out[key] = val
  })
  return out
}

/**
 * Verifica se a planilha tem todas as colunas obrigatórias.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} colunasObrigatorias chaves já normalizadas
 * @returns {{ valido: boolean, faltando: string[] }}
 */
export function validarColunas(rows, colunasObrigatorias) {
  if (!rows.length) return { valido: false, faltando: colunasObrigatorias }
  const headers = new Set(Object.keys(rows[0]))
  const faltando = colunasObrigatorias.filter((c) => !headers.has(c))
  return { valido: faltando.length === 0, faltando }
}
