import { MES_BADGE } from './constants'

export const getTodayISO = () => {
  const d = new Date()
  const z = (n) => ('0' + n).slice(-2)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export const normalizeDate = (input) => {
  if (!input) return null
  if (typeof input === 'object' && typeof input.toDate === 'function') {
    const d = input.toDate()
    const z = (n) => ('0' + n).slice(-2)
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
  }
  if (typeof input === 'string') return input.slice(0, 10)
  return null
}

export const parseLocalMidnight = (isoDate) => {
  if (!isoDate) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export const isBetweenInclusive = (iso, start, end) => {
  if (!iso || !start || !end) return false
  return iso >= start && iso <= end
}

/**
 * Calcula o status visual de um contrato — usado pelo badge da coluna Vigência.
 * Prioridade: Pausado > Pago_e_nao_iniciado > Vencido/Nao_renovou > Renova_esse_mes > Ativo > Pendente.
 *
 * @param c Contrato (com status_manual, data_inicio, data_fim, data_pagamento_principal)
 * @param hojeISO Data de hoje 'YYYY-MM-DD'
 * @param dateRange { start, end } do mês visualizado (pra "Renova esse mês")
 * @returns Uma chave de STATUS_BADGE
 */
export const computeContratoStatus = (c, hojeISO, dateRange = null) => {
  if (!c) return 'Pendente'
  if (c.status_manual === 'Pausado') return 'Pausado'

  const inicio = normalizeDate(c.data_inicio)
  const fim = normalizeDate(c.data_fim)
  const dp = normalizeDate(c.data_pagamento_principal)

  if (!inicio && dp) return 'Pago_e_nao_iniciado'

  if (fim && fim < hojeISO) {
    // Vencido (≤30d) vs Nao_renovou (>30d)
    const fimDate = new Date(fim + 'T12:00:00')
    const hojeDate = new Date(hojeISO + 'T12:00:00')
    const dias = Math.floor((hojeDate - fimDate) / 86400000)
    return dias > 30 ? 'Nao_renovou' : 'Vencido'
  }

  if (inicio && fim && inicio <= hojeISO && hojeISO <= fim) {
    if (dateRange && fim >= dateRange.start && fim <= dateRange.end) {
      return 'Renova_esse_mes'
    }
    return 'Ativo'
  }

  return 'Pendente'
}

export const formatDateBr = (dateStr) => {
  if (!dateStr) return '—'
  const iso = normalizeDate(dateStr)
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const diffDaysISO = (fromISO, toISO) => {
  if (!fromISO || !toISO) return null
  const a = parseLocalMidnight(fromISO)
  const b = parseLocalMidnight(toISO)
  if (!a || !b) return null
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export const addDaysISO = (dateStr, days) => {
  if (!dateStr) return ''
  const date = parseLocalMidnight(dateStr)
  date.setDate(date.getDate() + Number(days || 0))
  const z = (n) => ('0' + n).slice(-2)
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`
}

export const addMonths = (dateStr, months) => {
  if (!dateStr) return ''
  const date = parseLocalMidnight(dateStr)
  date.setMonth(date.getMonth() + parseInt(months || 0))
  const z = (n) => ('0' + n).slice(-2)
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`
}

export const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export const removeAccents = (str = '') =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const smartSearch = (target, query) => {
  if (!target) return false
  if (!query) return true
  const t = removeAccents(target)
  const q = removeAccents(query)
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = q.split('%').map(escapeRegex).join('.*')
  return new RegExp(pattern).test(t)
}

export const getMonthBadge = (dateStr) => {
  const iso = normalizeDate(dateStr)
  if (!iso) return { day: '--', name: '—', className: 'bg-gray-500/10 text-gray-500 border-gray-500/30' }
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = String(date.getDate()).padStart(2, '0')
  const monthIndex = date.getMonth()
  return { day, ...MES_BADGE[monthIndex] }
}

export const getRangeFromMonth = (ym) => {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  const z = (n) => ('0' + n).slice(-2)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    start: `${y}-${z(m)}-01`,
    end: `${y}-${z(m)}-${z(lastDay)}`,
  }
}

export const monthLabelFromYM = (ym) => {
  if (!ym) return 'MÊS'
  const [y, m] = ym.split('-').map(Number)
  const abbr = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][m - 1] || 'MÊS'
  return `${abbr}/${String(y).slice(2)}`
}

export const currentYM = () => {
  const d = new Date()
  const z = (n) => ('0' + n).slice(-2)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}`
}

export const sumParcelasPagasNoRange = (parcelas, start, end) => {
  if (!Array.isArray(parcelas)) return 0
  return parcelas.reduce((acc, p) => {
    const dp = normalizeDate(p.data_pagamento)
    if (dp && isBetweenInclusive(dp, start, end)) {
      return acc + (parseFloat(p.valor_parcela) || 0)
    }
    return acc
  }, 0)
}

export const sumParcelasVencendoNoRange = (parcelas, start, end) => {
  if (!Array.isArray(parcelas)) return 0
  return parcelas.reduce((acc, p) => {
    const dv = normalizeDate(p.data_vencimento)
    if (dv && isBetweenInclusive(dv, start, end)) {
      return acc + (parseFloat(p.valor_parcela) || 0)
    }
    return acc
  }, 0)
}

export const isContratoCobreMes = (contrato, start, end) => {
  const inicio = normalizeDate(contrato.data_inicio)
  const fim = normalizeDate(contrato.data_fim)
  if (!inicio || !fim) return false
  return inicio <= end && fim >= start
}

/**
 * Contrato está "no período" se:
 *   - cobre o mês (vigência cruza o range), OU
 *   - data_fim cai no range (vencendo), OU
 *   - data_pagamento_principal cai no range (Pago e não iniciado).
 * Inclui contratos sem vigência mas com pagamento dentro do range.
 */
export const contratoNoPeriodo = (contrato, start, end) => {
  if (isContratoCobreMes(contrato, start, end)) return true
  const fim = normalizeDate(contrato.data_fim)
  if (fim && isBetweenInclusive(fim, start, end)) return true
  const dp = normalizeDate(contrato.data_pagamento_principal)
  if (dp && isBetweenInclusive(dp, start, end)) return true
  return false
}

/**
 * Executa N tasks com concorrência limitada (mantém ordem do input).
 */
export async function withConcurrency(items, limit, fn) {
  const out = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const cur = idx++
      if (cur >= items.length) return
      try { out[cur] = await fn(items[cur], cur) }
      catch (e) { out[cur] = null }
    }
  })
  await Promise.all(workers)
  return out
}
