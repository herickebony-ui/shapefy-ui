import client from './client'
import { profissionalLogado } from './helpers'
import { filtrosBusca } from '../utils/strings'

const DOCTYPE = 'Treino%20Realizado'

const LIST_FIELDS = [
  'name', 'nome_completo', 'aluno', 'ficha', 'treino', 'treino_label',
  'data_e_hora_do_inicio', 'data_e_hora_do_conclusao', 'tempo_total_de_treino',
  'status', 'intensidade_do_treino', 'entregue', 'data_entrega', 'tem_aerobico',
]

const nowFrappeDatetime = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const listarTreinosRealizados = async ({ busca, alunoId, status, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (alunoId) filters.push(['aluno', '=', alunoId])
  if (status) filters.push(['status', '=', status])
  if (busca) filters.push(...filtrosBusca('nome_completo', busca))

  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(LIST_FIELDS),
      filters: JSON.stringify(filters),
      limit: busca ? 200 : limit,
      limit_start: busca ? 0 : (page - 1) * limit,
      order_by: 'data_e_hora_do_inicio desc',
    },
  })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarTreinoRealizado = async (id) => {
  const res = await client.get(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
  return res.data.data
}

// Aeróbicos não ficam na child legada do Treino Realizado — vivem no DocType
// 'Aerobico Realizado' (aluno + data_marcacao). Busca os que o aluno fez na data
// do treino, mesma lógica do flag tem_aerobico do backend.
export const listarAerobicosRealizados = async ({ aluno, data } = {}) => {
  if (!aluno || !data) return []
  const res = await client.get('/api/resource/Aerobico Realizado', {
    params: {
      fields: JSON.stringify(['name', 'exercicio', 'aerobico_id', 'frequencia_texto', 'data_marcacao']),
      filters: JSON.stringify([['aluno', '=', aluno], ['data_marcacao', '=', data]]),
      limit: 100,
      order_by: 'creation asc',
    },
  })
  // Cada registro existente em Aerobico Realizado = aeróbico concluído; o
  // SectionTable usa o flag `realizado` pra marcar verde/feito.
  return (res.data?.data || []).map(a => ({ ...a, realizado: 1 }))
}

export const salvarFeedbackProfissional = async (id, feedback) => {
  const res = await client.put(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`, {
    feedback_do_profissional: feedback,
  })
  return res.data.data
}

export const excluirTreinoRealizado = async (id) => {
  await client.delete(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
}

export const marcarEntregueTreino = async (id, entregue = true) => {
  const payload = entregue
    ? { entregue: 1, data_entrega: nowFrappeDatetime() }
    : { entregue: 0, data_entrega: null }
  const res = await client.put(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`, payload)
  return res.data?.data
}

// Retorna alunos com ficha vigente pelo intervalo de datas (data_de_inicio <= hoje <= data_de_fim)
// que não registraram nenhum treino nos últimos `dias` dias.
// "Vigente" é determinado exclusivamente pelo período de datas — não pelo campo enabled.
export const listarAlunosInativosComFicha = async (dias = 7) => {
  const prof = profissionalLogado()
  const hoje = new Date()
  const hojeISO = hoje.toISOString().split('T')[0]
  const corte = new Date(hoje)
  corte.setDate(corte.getDate() - dias)
  const corteISO = `${corte.toISOString().split('T')[0]} 00:00:00`

  const [fichasRes, treinosRes] = await Promise.all([
    // Busca fichas que já iniciaram (data_de_inicio <= hoje); o filtro de data_de_fim é feito no cliente
    // porque data_de_fim NULL (sem prazo) deve ser tratado como ainda vigente.
    client.get('/api/resource/Ficha', {
      params: {
        fields: JSON.stringify(['name', 'aluno', 'nome_completo', 'data_de_fim', 'data_de_inicio']),
        filters: JSON.stringify([
          ['profissional', '=', prof],
          ['data_de_inicio', '<=', hojeISO],
        ]),
        limit: 500,
        order_by: 'nome_completo asc',
      },
    }),
    client.get(`/api/resource/${DOCTYPE}`, {
      params: {
        fields: JSON.stringify(['aluno']),
        filters: JSON.stringify([
          ['profissional', '=', prof],
          ['data_e_hora_do_inicio', '>=', corteISO],
        ]),
        limit: 500,
      },
    }),
  ])

  const fichas = fichasRes.data.data || []
  const treinosRecentes = new Set((treinosRes.data.data || []).map(t => t.aluno))

  // Vigente = começou até hoje E (sem data_de_fim definida OU data_de_fim >= hoje)
  const vigentes = fichas.filter(f =>
    (!f.data_de_fim || f.data_de_fim >= hojeISO)
  )

  // Deduplica por aluno (pega a ficha com data_de_fim mais longe)
  const porAluno = new Map()
  for (const f of vigentes) {
    const atual = porAluno.get(f.aluno)
    if (!atual || (f.data_de_fim || '9999') > (atual.data_de_fim || '9999')) {
      porAluno.set(f.aluno, f)
    }
  }

  return [...porAluno.values()].filter(f => !treinosRecentes.has(f.aluno))
}

export const listarIdsDoAluno = async (alunoId, limit = 300) => {
  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(['name']),
      filters: JSON.stringify([['aluno', '=', alunoId], ['status', '=', 'Finalizado']]),
      limit,
      order_by: 'data_e_hora_do_inicio asc',
    },
  })
  return (res.data.data || []).map(t => t.name)
}
