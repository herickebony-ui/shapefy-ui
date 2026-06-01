import client from './client'

// CRUD de Conjunto de Fotos (template de slots do profissional).
// Doctype: "Conjunto de Fotos" (+ child "Conjunto de Fotos Slot").

const DOCTYPE = 'Conjunto%20de%20Fotos'
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarConjuntos = async ({ busca, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (busca) filters.push(['titulo', 'like', `%${busca}%`])
  const params = {
    fields: JSON.stringify(['name', 'titulo', 'enabled', 'profissional']),
    filters: JSON.stringify(filters),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'modified desc',
  }
  const res = await client.get(`/api/resource/${DOCTYPE}`, { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarConjunto = async (id) => {
  const res = await client.get(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
  return res.data.data
}

export const criarConjunto = async (payload) => {
  const res = await client.post(`/api/resource/${DOCTYPE}`, {
    profissional: profissionalLogado(),
    ...payload,
  })
  return res.data.data
}

export const salvarConjunto = async (id, payload) => {
  const res = await client.put(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`, payload)
  return res.data.data
}

export const excluirConjunto = async (id) => {
  await client.delete(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
}
