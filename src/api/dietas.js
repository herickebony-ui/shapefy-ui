import client from './client'

export const listarDietas = async ({ alunoId, page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify(["name","estrategia","data_inicial","data_final","total_kcal","dias_semana","aluno","nome_completo"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (alunoId) params.filters = JSON.stringify([["aluno","=", alunoId]])
  const res = await client.get('/api/resource/Dieta', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarDieta = async (id) => {
  const res = await client.get(`/api/resource/Dieta/${id}`)
  return res.data.data
}

export const salvarDieta = async (id, campos) => {
  const res = await client.put(`/api/resource/Dieta/${id}`, campos)
  return res.data.data
}

export const excluirDieta = async (id) => {
  await client.delete(`/api/resource/Dieta/${id}`)
}