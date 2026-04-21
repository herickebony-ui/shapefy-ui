import client from './client'

export const buscarManipulados = async (busca = '', limit = 20) => {
  const filters = [['enabled', '=', 1]]
  if (busca) filters.push(['full_name', 'like', `%${busca}%`])
  const res = await client.get('/api/resource/Manipulados', {
    params: {
      fields: JSON.stringify(['name', 'full_name', 'description']),
      filters: JSON.stringify(filters),
      limit,
      order_by: 'full_name asc',
    },
  })
  return res.data?.data || []
}

export const listarManipulados = async () => {
  const res = await client.get('/api/resource/Manipulados', {
    params: {
      fields: JSON.stringify(['name', 'full_name', 'description', 'enabled']),
      filters: JSON.stringify([]),
      limit: 200,
      order_by: 'full_name asc',
    },
  })
  return res.data?.data || []
}

export const criarManipulado = async ({ full_name, description }) => {
  const res = await client.post('/api/resource/Manipulados', { full_name, description, enabled: 1 })
  return res.data?.data
}

export const salvarManipulado = async (name, { full_name, description, enabled }) => {
  const res = await client.put(`/api/resource/Manipulados/${encodeURIComponent(name)}`, { full_name, description, enabled })
  return res.data?.data
}

export const excluirManipulado = async (name) => {
  await client.delete(`/api/resource/Manipulados/${encodeURIComponent(name)}`)
}
