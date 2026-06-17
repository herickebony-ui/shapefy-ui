import client from './client'
import { profissionalLogado } from './helpers'

const ENC_FA = encodeURIComponent('Feedback Agendado')

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
      'is_training',
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
      'is_training',
      'conjunto_fotos',
      'incluir_peso',
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
    is_training = 0,
    conjunto_fotos,
    incluir_peso,
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
    is_training: is_training ? 1 : 0,
    // Coleta de evolução (override do cronograma; vazio = backend herda do formulário)
    ...(conjunto_fotos ? { conjunto_fotos } : {}),
    ...(incluir_peso != null ? { incluir_peso: incluir_peso ? 1 : 0 } : {}),
  })
  return res.data.data
}

export const salvarAgendamento = async (id, campos) => {
  const payload = { ...campos }
  if ('is_start' in payload) payload.is_start = payload.is_start ? 1 : 0
  if ('is_training' in payload) payload.is_training = payload.is_training ? 1 : 0
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
 * Um agendamento é "respondido" (histórico) quando já tem resposta registrada
 * ou status final. Esses NUNCA podem ser apagados nem sobrescritos pelo sync —
 * preservam o histórico do aluno entre renovações de ciclo.
 */
export const ehRespondido = (ag) =>
  !!ag?.respondido_em || ag?.status === 'Respondido' || ag?.status === 'Concluido'

/**
 * Sincroniza o cronograma do aluno: dado um array novo de datas, atualiza/cria
 * as pendentes e apaga as pendentes que sumiram. Usado no botão "Salvar".
 *
 * payloads = [{ formulario, data_agendada, dias_aviso, nota, is_start, status }]
 *
 * Dedupe por DATA (aluno só pode ter 1 agendamento por dia). Se a data já
 * existe, atualiza no lugar (incluindo formulario, caso o profissional troque).
 * Datas pendentes que sumiram do novo array são excluídas.
 *
 * HISTÓRICO PRESERVADO: agendamentos respondidos (ehRespondido) nunca são
 * apagados nem sobrescritos, mesmo que sumam do array ou coincidam com uma
 * data gerada.
 */
export const sincronizarCronogramaDoAluno = async (alunoId, payloads) => {
  const existentes = await listarAgendamentosDoAluno(alunoId)
  const mapaExistentes = {}
  existentes.forEach(e => { mapaExistentes[e.data_agendada] = e })

  const operacoes = { criados: [], atualizados: [], removidos: [], preservados: [] }
  const datasNovas = new Set()

  for (const p of payloads) {
    datasNovas.add(p.data_agendada)
    const ex = mapaExistentes[p.data_agendada]
    if (ex) {
      // Respondido → preserva intacto (não sobrescreve status/resposta)
      if (ehRespondido(ex)) {
        operacoes.preservados.push(ex.name)
        continue
      }
      // Pendente já existe → atualiza no lugar (inclui formulario p/ permitir troca)
      await salvarAgendamento(ex.name, {
        formulario: p.formulario,
        dias_aviso: p.dias_aviso,
        observacao: p.observacao || '',
        nota: p.nota || '',
        is_start: p.is_start ? 1 : 0,
        is_training: p.is_training ? 1 : 0,
        status: p.status || ex.status,
        conjunto_fotos: p.conjunto_fotos || '',
        ...(p.incluir_peso != null ? { incluir_peso: p.incluir_peso ? 1 : 0 } : {}),
      })
      operacoes.atualizados.push(ex.name)
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
        is_training: p.is_training ? 1 : 0,
        conjunto_fotos: p.conjunto_fotos || '',
        incluir_peso: p.incluir_peso,
      })
      operacoes.criados.push(novo.name)
    }
  }

  for (const ex of existentes) {
    if (!datasNovas.has(ex.data_agendada)) {
      // Respondido → nunca apaga (histórico)
      if (ehRespondido(ex)) {
        operacoes.preservados.push(ex.name)
        continue
      }
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
    is_training: o.is_training || 0,
  }))
  return await criarAgendamentosEmLote(payloads)
}

// ─── Status de cronograma para Hub de Alunos ──────────────────────────────────

/**
 * Para uma lista de alunos, retorna { [alunoId]: { proximo, atrasados, total } }.
 * Usado no Hub de Alunos para mostrar coluna "Cronograma".
 *
 * Implementação client-side: faz UMA query com filtro "in" pelos IDs de alunos.
 * (Se o backend disponibilizar a função whitelist obter_status_cronograma_alunos,
 *  trocar por essa chamada — é só otimização.)
 */
export const obterStatusCronogramaAlunos = async (alunosIds = []) => {
  if (!alunosIds.length) return {}
  const profissional = profissionalLogado()
  const params = {
    fields: JSON.stringify([
      'name',
      'aluno',
      'data_agendada',
      'status',
      'is_start',
    ]),
    filters: JSON.stringify([
      ['profissional', '=', profissional],
      ['aluno', 'in', alunosIds],
    ]),
    limit: 5000,
    order_by: 'data_agendada asc',
  }
  const res = await client.get(`/api/resource/${ENC_FA}`, { params })
  const lista = res.data.data || []

  const hoje = new Date().toISOString().slice(0, 10)
  const out = {}
  lista.forEach(item => {
    if (!out[item.aluno]) out[item.aluno] = { proximo: null, atrasados: 0, total: 0 }
    out[item.aluno].total += 1

    const respondido = item.status === 'Respondido' || item.status === 'Concluido'

    if (!respondido && !item.is_start && item.data_agendada < hoje) {
      out[item.aluno].atrasados += 1
    }
    if (
      !respondido && !item.is_start &&
      item.data_agendada >= hoje &&
      (!out[item.aluno].proximo || item.data_agendada < out[item.aluno].proximo)
    ) {
      out[item.aluno].proximo = item.data_agendada
    }
  })
  return out
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