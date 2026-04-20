import client from './client'

const frappeOwner = () => localStorage.getItem('frappe_user') || ''
const OWNERS_BASE = ['Administrator', 'teste@shapefy.com']

export const OWNERS_PROTEGIDOS = ['administrator', 'teste@shapefy.com']

export const podeExcluir = (owner) =>
  !OWNERS_PROTEGIDOS.includes(String(owner || '').toLowerCase())

export const listarAlimentos = async ({
  busca = '', grupo = '', enabled = '', page = 1, limit = 300,
} = {}) => {
  const filters = [['food', 'like', busca ? `%${busca}%` : '%']]
  if (grupo) filters.push(['food_group', '=', grupo])
  if (enabled !== '') filters.push(['enabled', '=', Number(enabled)])

  const data = new URLSearchParams({
    doctype: 'Alimento',
    fields: JSON.stringify([
      'name', 'food', 'calories', 'protein', 'carbohydrate', 'lipid',
      'fiber', 'food_group', 'ref_weight', 'unit', 'enabled', 'public', 'owner',
    ]),
    filters: JSON.stringify(filters),
    limit_start: (page - 1) * limit,
    limit_page_length: limit,
    order_by: 'food asc',
  })

  const res = await client.post('/api/method/frappe.desk.reportview.get', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const result = res.data.message
  const list = result?.values?.map(row =>
    Object.fromEntries(result.keys.map((k, i) => [k, row[i]]))
  ) || []
  return { list, hasMore: list.length === limit }
}

export const buscarAlimento = async (name) => {
  const res = await client.get(`/api/resource/Alimento/${encodeURIComponent(name)}`)
  return res.data.data
}

export const criarAlimento = async (dados) => {
  const res = await client.post('/api/resource/Alimento', dados)
  return res.data.data
}

export const salvarAlimento = async (name, dados) => {
  const res = await client.put(`/api/resource/Alimento/${encodeURIComponent(name)}`, dados)
  return res.data.data
}

export const excluirAlimento = async (name) => {
  await client.delete(`/api/resource/Alimento/${encodeURIComponent(name)}`)
}

export const toggleAlimento = async (name, enabled) => {
  const res = await client.put(`/api/resource/Alimento/${encodeURIComponent(name)}`, { enabled })
  return res.data.data
}

export const listarGruposAlimentares = async () => {
  const res = await client.get('/api/resource/Grupo%20Alimentar', {
    params: {
      fields: JSON.stringify(['name', 'grupo']),
      limit_page_length: 100,
      order_by: 'grupo asc',
    },
  })
  return res.data.data || []
}
