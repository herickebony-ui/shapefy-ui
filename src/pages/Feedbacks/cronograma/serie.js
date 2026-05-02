import { dataEhFerias } from '../../../api/ferias'
import { ehFeriado } from './utils'

/**
 * Gera datas em série dentro de um intervalo, respeitando filtros opcionais.
 *
 * @param {Object} cfg
 * @param {string} cfg.data_inicio  ISO 'YYYY-MM-DD'
 * @param {string} cfg.data_fim     ISO 'YYYY-MM-DD'
 * @param {'periodico'|'dias_do_mes'} [cfg.modo='periodico']
 *
 * Modo 'periodico':
 * @param {number} cfg.intervalo  quantidade
 * @param {'semanas'|'dias'} [cfg.unidade='semanas']
 * @param {number} [cfg.dia_semana]  0..6 (Dom..Sáb). Força a 1ª data nesse dia.
 *
 * Modo 'dias_do_mes':
 * @param {number[]} cfg.dias_do_mes  ex: [5, 20] gera todo dia 5 e 20.
 *                                    Dias inválidos no mês (31/02) são pulados.
 *
 * Comum:
 * @param {boolean} [cfg.pular_ferias=false]
 * @param {Array}   [cfg.feriasList=[]]
 * @param {boolean} [cfg.pular_feriados=false]
 *
 * Retorna: array de { iso, emFerias, emFeriado, feriadoNome }
 */
export function gerarDatasSerie({
  data_inicio,
  data_fim,
  modo = 'periodico',
  // periodico
  intervalo,
  unidade = 'semanas',
  dia_semana,
  // dias_do_mes
  dias_do_mes = [],
  // comum
  pular_ferias = false,
  feriasList = [],
  pular_feriados = false,
} = {}) {
  if (!data_inicio || !data_fim) return []
  const inicio = new Date(data_inicio + 'T12:00:00')
  const fim = new Date(data_fim + 'T12:00:00')
  if (fim < inicio) return []

  const marcarFlags = (iso) => {
    const feriadoNome = pular_feriados ? ehFeriado(iso) : null
    return {
      iso,
      emFeriado: !!feriadoNome,
      feriadoNome,
      emFerias: pular_ferias && dataEhFerias(iso, feriasList),
    }
  }

  // ─── Modo 2: dias fixos do mês ──────────────────────────────────────────────
  if (modo === 'dias_do_mes') {
    if (!dias_do_mes?.length) return []
    const diasOrdenados = [...new Set(dias_do_mes)].sort((a, b) => a - b)
    const datas = []
    const cursor = new Date(inicio)
    cursor.setDate(1)
    let safety = 0
    while (cursor <= fim && safety < 500) {
      const ano = cursor.getFullYear()
      const mes = cursor.getMonth()
      for (const dia of diasOrdenados) {
        const candidato = new Date(ano, mes, dia, 12, 0, 0)
        // dia 31 em mês curto pula (vira mês seguinte)
        if (candidato.getMonth() !== mes) continue
        if (candidato < inicio || candidato > fim) continue
        datas.push(marcarFlags(candidato.toISOString().slice(0, 10)))
      }
      cursor.setMonth(mes + 1)
      safety++
    }
    return datas
  }

  // ─── Modo 1: periódico (default) ────────────────────────────────────────────
  if (!intervalo) return []
  const stepDias = unidade === 'semanas' ? Number(intervalo) * 7 : Number(intervalo)
  if (stepDias < 1) return []

  const cursor = new Date(inicio)
  if (typeof dia_semana === 'number' && dia_semana >= 0 && dia_semana <= 6) {
    while (cursor.getDay() !== dia_semana && cursor <= fim) {
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const datas = []
  let safety = 0
  while (cursor <= fim && safety < 500) {
    datas.push(marcarFlags(cursor.toISOString().slice(0, 10)))
    cursor.setDate(cursor.getDate() + stepDias)
    safety++
  }
  return datas
}

/**
 * Agrupa as datas em "ciclos" delimitados por Marco Zero/Trocas.
 * Cada Troca encerra o ciclo atual e abre o próximo. O label de cada grupo
 * descreve a ficha CONTIDA nele (ex: "4 semanas") — calculado pela distância
 * entre o início do grupo e a próxima Troca.
 *
 * @param {Array} dates  array de objetos com { date, is_start, is_training, ... }
 * @returns {Array<{ label: string, items: Array }>}
 */
export function agruparPorCiclo(dates) {
  if (!dates?.length) return []
  const sorted = [...dates].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const grupos = []
  let atual = { label: 'Início', items: [] }

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i]
    atual.items.push(d)
    if (d.is_training) {
      grupos.push(atual)
      // calcula label do PRÓXIMO grupo (semanas até a próxima Troca, se houver)
      const proxMarcoIdx = sorted.findIndex((x, j) => j > i && x.is_training)
      let label = 'Ciclo a definir'
      if (proxMarcoIdx !== -1) {
        const sem = Math.round(
          (new Date(sorted[proxMarcoIdx].date) - new Date(d.date)) / (7 * 86400000),
        )
        label = `${sem} semanas`
      }
      atual = { label, items: [] }
    }
  }
  if (atual.items.length) grupos.push(atual)

  // Ajusta o label do PRIMEIRO grupo: até a primeira Troca
  if (grupos.length > 0) {
    const primeiraTrocaIdx = sorted.findIndex(x => x.is_training)
    if (primeiraTrocaIdx !== -1) {
      const inicio = sorted[0]
      const sem = Math.round(
        (new Date(sorted[primeiraTrocaIdx].date) - new Date(inicio.date)) / (7 * 86400000),
      )
      grupos[0].label = `${sem} semanas`
    } else {
      grupos[0].label = 'Ciclo a definir'
    }
  }
  return grupos
}
