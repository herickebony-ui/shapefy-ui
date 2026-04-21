import client from './client'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarPrescricoes = async ({ busca, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (busca) filters.push(['nome_completo', 'like', `%${busca}%`])

  const res = await client.get('/api/resource/Prescricao%20Paciente', {
    params: {
      fields: JSON.stringify(['name', 'aluno', 'nome_completo', 'date', 'description', 'published']),
      filters: JSON.stringify(filters),
      limit,
      limit_start: (page - 1) * limit,
      order_by: 'date desc',
    },
  })
  const list = res.data?.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarPrescricao = async (name) => {
  const res = await client.get(`/api/resource/Prescricao%20Paciente/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const criarPrescricao = async (data) => {
  const res = await client.post('/api/resource/Prescricao%20Paciente', data)
  return res.data?.data
}

export const salvarPrescricao = async (name, data) => {
  const res = await client.put(`/api/resource/Prescricao%20Paciente/${encodeURIComponent(name)}`, data)
  return res.data?.data
}

export const togglePrescricao = async (name, published) => {
  const res = await client.put(`/api/resource/Prescricao%20Paciente/${encodeURIComponent(name)}`, { published })
  return res.data?.data
}

export const excluirPrescricao = async (name) => {
  await client.delete(`/api/resource/Prescricao%20Paciente/${encodeURIComponent(name)}`)
}
