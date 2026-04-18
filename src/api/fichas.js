import client from './client'

export const listarFichas = async ({ alunoId, page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify(["name","titulo","creation","status","aluno"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (alunoId) params.filters = JSON.stringify([["aluno","=", alunoId]])
  const res = await client.get('/api/resource/Ficha', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarFicha = async (id) => {
  const res = await client.get(`/api/resource/Ficha/${id}`)
  return res.data.data
}

export const salvarFicha = async (id, campos) => {
  const res = await client.put(`/api/resource/Ficha/${id}`, campos)
  return res.data.data
}