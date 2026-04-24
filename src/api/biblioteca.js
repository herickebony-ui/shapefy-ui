import client from './client'

const OWNERS_BASE = ['Administrator', 'teste@shapefy.com']

export const importarDaBiblioteca = async (doctype, names) => {
  const res = await client.post('/api/method/shapefy.api.api.importar_da_biblioteca', { doctype, names })
  return res.data.message
}

export const listarBibliotecaAlimentos = async ({ busca = '', grupo = '', page = 1, limit = 300 } = {}) => {
  const filters = [['owner', 'in', OWNERS_BASE], ['enabled', '=', 1]]
  if (busca) filters.push(['food', 'like', `%${busca}%`])
  if (grupo) filters.push(['food_group', '=', grupo])
  const res = await client.get('/api/resource/Alimento', {
    params: {
      fields: JSON.stringify(['name', 'food', 'food_group', 'calories', 'protein', 'carbohydrate', 'lipid', 'ref_weight', 'unit']),
      filters: JSON.stringify(filters),
      limit_start: (page - 1) * limit,
      limit_page_length: limit,
      order_by: 'food asc',
    },
  })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const listarBibliotecaExercicios = async ({ busca = '', grupo = '', limit = 500 } = {}) => {
  const filters = [['enabled', '=', 1], ['owner', 'in', OWNERS_BASE]]
  if (grupo) filters.push(['grupo_muscular', '=', grupo])
  const res = await client.get('/api/resource/Treino%20Exercicio', {
    params: {
      fields: JSON.stringify(['name', 'nome_do_exercicio', 'grupo_muscular']),
      filters: JSON.stringify(filters),
      limit,
      order_by: 'nome_do_exercicio asc',
    },
  })
  const list = (res.data?.data || []).filter(e =>
    !busca || (e.nome_do_exercicio || '').toLowerCase().includes(busca.toLowerCase())
  )
  return list
}

export const listarBibliotecaAlongamentos = async ({ busca = '', limit = 200 } = {}) => {
  const filters = [['Alongamento', 'owner', 'in', OWNERS_BASE], ['Alongamento', 'enabled', '=', 1]]
  const res = await client.get('/api/resource/Alongamento', {
    params: {
      fields: JSON.stringify(['name', 'nome_do_exercício']),
      filters: JSON.stringify(filters),
      limit,
    },
  })
  const list = (res.data?.data || []).filter(e =>
    !busca || (e['nome_do_exercício'] || '').toLowerCase().includes(busca.toLowerCase())
  )
  return list
}

export const listarBibliotecaAerobicos = async ({ busca = '', limit = 200 } = {}) => {
  const filters = [['Exercicio Aerobico', 'owner', 'in', OWNERS_BASE], ['Exercicio Aerobico', 'enabled', '=', 1]]
  const res = await client.get('/api/resource/Exercicio%20Aerobico', {
    params: {
      fields: JSON.stringify(['name', 'exercicio_aerobico']),
      filters: JSON.stringify(filters),
      limit,
    },
  })
  const list = (res.data?.data || []).filter(e =>
    !busca || (e.exercicio_aerobico || '').toLowerCase().includes(busca.toLowerCase())
  )
  return list
}
