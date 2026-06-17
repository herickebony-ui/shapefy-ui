import client from './client'
import { filtrosBusca } from '../utils/strings'

// CRUD de Conjunto de Fotos (template de slots do profissional).
// Doctype: "Conjunto de Fotos" (+ child "Conjunto de Fotos Slot").

const DOCTYPE = 'Conjunto%20de%20Fotos'
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarConjuntos = async ({ busca, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (busca) filters.push(...filtrosBusca('titulo', busca))
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

// Conjunto padrão do profissional (usado automaticamente nos feedbacks).
export const conjuntoPadraoAtual = async () => {
  const res = await client.get('/api/method/shapefy.evolucao.api.conjunto_padrao_atual')
  return res.data?.message?.conjunto_fotos_padrao || null
}

export const definirConjuntoPadrao = async (name) => {
  const res = await client.post('/api/method/shapefy.evolucao.api.definir_conjunto_padrao', { conjunto: name || '' })
  return res.data?.message?.conjunto_fotos_padrao || null
}
