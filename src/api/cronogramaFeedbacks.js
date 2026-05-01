import client from './client'

const ENC_FA = encodeURIComponent('Feedback Agendado')
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

// ─── Listagem geral (dashboard) ───────────────────────────────────────────────

/**
 * Lista todos os Feedback Agendado do profissional logado.
 * Filtros opcionais: aluno, status, dataInicio, dataFim.
 * Usado no dashboard pra montar Atrasados/Hoje/Próximos/etc.
 */
export const listarAgendamentos = async ({
  aluno = '',
  status = '',
  dataInicio = '',
  dataFim = '',
  page = 1,
  limit = 1000,
} = {}) => {
  const profissional = profissionalLogado()
  const filtros = [
    ['profissional', '=', profissional],
  ]
  if (aluno) filtros.push(['aluno', '=', aluno])
  if (status) filtros.push(['status', '=', status])
  if (dataInicio) filtros.push(['data_agendada', '>=', dataInicio])
  if (dataFim) filtros.push(['data_agendada', '<=', dataFim])

  const params = {
    fields: JSON.stringify([
      'name',
      'aluno',
      'formulario',
      'data_agendada',
      'dias_aviso',
      'status',
      'profissional',
      'avisado_em',
      'respondido_em',
      'feedback_resposta',
      'notificacao_aluno',
      'observacao',
      'nota',
      'is_start',
      'creation',
      'modified',
    ]),
    filters: JSON.stringify(filtros),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'data_agendada asc',
  }
  const res = await client.get(`/api/resource/${ENC_FA}`, { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

/**
 * Lista os agendamentos de UM aluno específico (todas as datas do cronograma dele).
 */
export const listarAgendamentosDoAluno = async (alunoId) => {
  if (!alunoId) return []
  const profissional = profissionalLogado()
  const params = {
    fields: JSON.stringify([
      'name',
      'aluno',
      'formulario',
      'data_agendada',
      'dias_aviso',
      'status',
      'avisado_em',
      'respondido_em',
      'feedback_resposta',
      'notificacao_aluno',
      'observacao',
      'nota',
      'is_start',
    ]),
    filters: JSON.stringify([
      ['profissional', '=', profissional],
      ['aluno', '=', alunoId],
    ]),
    limit: 1000,
    order_by: 'data_agendada asc',
  }
  const res = await client.get(`/api/resource/${ENC_FA}`, { params })
  return res.data.data || []
}

// ─── CRUD individual ──────────────────────────────────────────────────────────

export const buscarAgendamento = async (id) => {
  const res = await client.get(`/api/resource/${ENC_FA}/${encodeURIComponent(id)}`)
  return res.data.data
}

export const criarAgendamento = async (payload) => {
  const {
    aluno,
    formulario,
    data_agendada,
    dias_aviso = 1,
    status = 'Agendado',
    observacao = '',
    nota = '',
    is_start = 0,
  } = payload
  const res = await client.post(`/api/resource/${ENC_FA}`, {
    aluno,
    formulario,
    data_agendada,
    dias_aviso,
    status,
    profissional: profissionalLogado(),
    observacao,
    nota,
    is_start: is_start ? 1 : 0,
  })
  return res.data.data
}

export const salvarAgendamento = async (id, campos) => {
  // Normaliza is_start (boolean → 0/1)
  const payload = { ...campos }
  if ('is_start' in payload) payload.is_start = payload.is_start ? 1 : 0
  const res = await client.put(
    `/api/resource/${ENC_FA}/${encodeURIComponent(id)}`,
    payload
  )
  return res.data.data
}

export const excluirAgendamento = async (id) => {
  await client.delete(`/api/resource/${ENC_FA}/${encodeURIComponent(id)}`)
}

// ─── Operações em lote ────────────────────────────────────────────────────────

/**
 * Cria N agendamentos de uma vez (usado quando o profissional clica em várias
 * datas no calendário e clica "Salvar Cronograma").
 *
 * Estratégia: Promise.all sequencial-paralelo com chunks de 5 pra não estourar
 * rate limit do Frappe.
 */
export const criarAgendamentosEmLote = async (payloads) => {
  const CHUNK = 5
  const resultados = []
  for (let i = 0; i < payloads.length; i += CHUNK) {
    const chunk = payloads.slice(i, i + CHUNK)
    const res = await Promise.all(chunk.map(p => criarAgendamento(p)))
    resultados.push(...res)
  }
  return resultados
}

/**
 * Apaga todos os agendamentos de um aluno (usado em "Excluir Cronograma" ou
 * antes de "Clonar de outro aluno").
 */
export const excluirAgendamentosDoAluno = async (alunoId) => {
  const lista = await listarAgendamentosDoAluno(alunoId)
  for (const item of lista) {
    await excluirAgendamento(item.name)
  }
  return lista.length
}

/**
 * Sincroniza o cronograma do aluno: dado um array novo de datas, apaga os
 * antigos e cria os novos. Usado no botão "Salvar Alterações" da tela.
 *
 * payloads = [{ formulario, data_agendada, dias_aviso, nota, is_start, status }]
 *
 * NOTA: o backend do Frappe faz dedupe por (aluno + data + formulario) implícito
 * via aluno.dia_semana_feedback / dia_mes_feedback. Mas como aqui é manual,
 * a estratégia mais simples é: se o agendamento existe (mesmo aluno+data+formulario),
 * atualiza; senão cria.
 */
export const sincronizarCronogramaDoAluno = async (alunoId, payloads) => {
  const existentes = await listarAgendamentosDoAluno(alunoId)
  const mapaExistentes = {}
  existentes.forEach(e => {
    const chave = `${e.data_agendada}__${e.formulario}`
    mapaExistentes[chave] = e
  })

  const operacoes = { criados: [], atualizados: [], removidos: [] }
  const chavesNovas = new Set()

  // Cria ou atualiza
  for (const p of payloads) {
    const chave = `${p.data_agendada}__${p.formulario}`
    chavesNovas.add(chave)
    if (mapaExistentes[chave]) {
      // Já existe → atualiza só os campos mutáveis
      await salvarAgendamento(mapaExistentes[chave].name, {
        dias_aviso: p.dias_aviso,
        observacao: p.observacao || '',
        nota: p.nota || '',
        is_start: p.is_start ? 1 : 0,
        status: p.status || mapaExistentes[chave].status,
      })
      operacoes.atualizados.push(mapaExistentes[chave].name)
    } else {
      // Novo → cria
      const novo = await criarAgendamento({
        aluno: alunoId,
        formulario: p.formulario,
        data_agendada: p.data_agendada,
        dias_aviso: p.dias_aviso || 1,
        status: p.status || 'Agendado',
        observacao: p.observacao || '',
        nota: p.nota || '',
        is_start: p.is_start ? 1 : 0,
      })
      operacoes.criados.push(novo.name)
    }
  }

  // Remove os que sumiram
  for (const ex of existentes) {
    const chave = `${ex.data_agendada}__${ex.formulario}`
    if (!chavesNovas.has(chave)) {
      await excluirAgendamento(ex.name)
      operacoes.removidos.push(ex.name)
    }
  }

  return operacoes
}

/**
 * Clona o cronograma de um aluno origem pra um aluno destino.
 * Mantém formulário, dias_aviso e is_start. Não copia nota nem observacao
 * (são específicas do aluno original).
 */
export const clonarCronograma = async (alunoOrigemId, alunoDestinoId) => {
  const origem = await listarAgendamentosDoAluno(alunoOrigemId)
  if (origem.length === 0) {
    throw new Error('Aluno de origem não tem cronograma')
  }
  const payloads = origem.map(o => ({
    aluno: alunoDestinoId,
    formulario: o.formulario,
    data_agendada: o.data_agendada,
    dias_aviso: o.dias_aviso || 1,
    status: 'Agendado', // Reset status no destino
    is_start: o.is_start || 0,
  }))
  return await criarAgendamentosEmLote(payloads)
}

// ─── Estatísticas / Dashboard ─────────────────────────────────────────────────

/**
 * Calcula contadores pro dashboard a partir de uma lista de agendamentos.
 * Não chama API — recebe a lista já carregada.
 */
export const calcularEstatisticasDashboard = (lista, hojeISO = null) => {
  const hoje = hojeISO ? new Date(hojeISO + 'T00:00:00') : new Date()
  hoje.setHours(0, 0, 0, 0)

  const stats = {
    atrasados: [], // 1-7 dias atrasado, status != Respondido
    naoEnviados: [], // > 7 dias atrasado
    hoje: [],
    proximos: [], // próximos 7 dias
    respondidos: [], // status Respondido (este mês)
    total: lista.length,
  }

  lista.forEach(item => {
    if (item.is_start) return // Marco zero não conta em estatísticas
    const dataItem = new Date(item.data_agendada + 'T00:00:00')
    dataItem.setHours(0, 0, 0, 0)
    const diffMs = hoje - dataItem
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const respondido = item.status === 'Respondido' || item.status === 'Concluido'

    if (respondido) {
      // Considera respondido este mês
      if (dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear()) {
        stats.respondidos.push(item)
      }
      return
    }

    if (diffDias === 0) {
      stats.hoje.push(item)
    } else if (diffDias > 0 && diffDias <= 7) {
      stats.atrasados.push(item)
    } else if (diffDias > 7) {
      stats.naoEnviados.push(item)
    } else if (diffDias < 0 && diffDias >= -7) {
      stats.proximos.push(item)
    }
  })

  return stats
}