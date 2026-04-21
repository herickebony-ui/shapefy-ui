import client from './client'

const DOCTYPE = 'Treino%20Realizado'
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const LIST_FIELDS = [
  'name', 'nome_completo', 'aluno', 'ficha', 'treino', 'treino_label',
  'data_e_hora_do_inicio', 'data_e_hora_do_conclusao', 'tempo_total_de_treino',
  'status', 'intensidade_do_treino',
]

export const listarTreinosRealizados = async ({ busca, alunoId, status, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (alunoId) filters.push(['aluno', '=', alunoId])
  if (status) filters.push(['status', '=', status])
  if (busca) filters.push(['nome_completo', 'like', `%${busca}%`])

  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(LIST_FIELDS),
      filters: JSON.stringify(filters),
      limit,
      limit_start: (page - 1) * limit,
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

export const salvarFeedbackProfissional = async (id, feedback) => {
  const res = await client.put(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`, {
    feedback_do_profissional: feedback,
  })
  return res.data.data
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
