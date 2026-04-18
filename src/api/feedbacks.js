import client from './client'

export const listarFeedbacks = async ({ alunoId, page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify(["name","aluno","nome_completo","status","date","profissional"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (alunoId) params.filters = JSON.stringify([["aluno","=", alunoId]])
  const res = await client.get('/api/resource/Feedback', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarFeedback = async (id) => {
  const res = await client.get(`/api/resource/Feedback/${id}`)
  return res.data.data
}