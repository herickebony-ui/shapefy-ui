import client from './client'

export const listarAlunos = async ({ search = '', page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify(["name","nome_completo","email","telefone","foto","enabled","dieta","treino","creation"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (search) {
    params.filters = JSON.stringify([["nome_completo","like",`%${search}%`]])
    params.limit = 200
    params.limit_start = 0
  }
  const res = await client.get('/api/resource/Aluno', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarAluno = async (id) => {
  const res = await client.get(`/api/resource/Aluno/${id}`)
  return res.data.data
}

export const salvarAluno = async (id, campos) => {
  const res = await client.put(`/api/resource/Aluno/${id}`, campos)
  return res.data.data
}

export const excluirAluno = async (id) => {
  await client.delete(`/api/resource/Aluno/${id}`)
}