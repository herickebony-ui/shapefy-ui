import client from './client'

const frappeOwner = () => localStorage.getItem('frappe_user') || ''

// ─── Fichas de Treino ─────────────────────────────────────────────────────────

export const listarFichas = async ({ busca, nivel, aluno, page = 1, limit = 50 } = {}) => {
  const filters = []
  if (busca) filters.push(['nome_completo', 'like', `%${busca}%`])
  if (nivel) filters.push(['nivel', '=', nivel])
  if (aluno) filters.push(['aluno', '=', aluno])

  const params = {
    fields: JSON.stringify([
      'name', 'creation', 'aluno', 'nome_completo',
      'nivel', 'objetivo', 'data_de_inicio', 'data_de_fim', 'estrutura_calculada',
    ]),
    filters: JSON.stringify(filters),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }

  const res = await client.get('/api/resource/Ficha', { params })
  const list = res.data?.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarFicha = async (id) => {
  const res = await client.get(`/api/resource/Ficha/${id}`)
  return res.data?.data
}

export const criarFicha = async (dados) => {
  const res = await client.post('/api/resource/Ficha', dados)
  return res.data?.data
}

export const salvarFicha = async (id, dados) => {
  const res = await client.put(`/api/resource/Ficha/${id}`, dados)
  return res.data?.data
}

export const excluirFicha = async (id) => {
  await client.delete(`/api/resource/Ficha/${id}`)
}

// ─── Exercícios ───────────────────────────────────────────────────────────────

const OWNERS_COMPARTILHADOS = ['teste@shapefy.com', 'Administrator']

export const salvarTreinoExercicio = async (id, dados) => {
  const url = id ? `/api/resource/Treino Exercicio/${encodeURIComponent(id)}` : '/api/resource/Treino Exercicio'
  const res = await client[id ? 'put' : 'post'](url, dados)
  return res.data?.data
}

export const excluirTreinoExercicio = async (id) => {
  try {
    await client.delete(`/api/resource/Treino%20Exercicio/${encodeURIComponent(id)}`)
  } catch {
    await client.put(`/api/resource/Treino%20Exercicio/${encodeURIComponent(id)}`, { enabled: 0 })
  }
}

export const listarGruposMusculares = async () => {
  const res = await client.get('/api/resource/Grupo Muscular', {
    params: {
      fields: JSON.stringify(['name']),
      filters: JSON.stringify([['Grupo Muscular', 'enabled', '=', 1]]),
      limit: 100,
      order_by: 'pos asc',
    },
  })
  return (res.data?.data || []).map(g => g.name)
}

export const salvarAlongamento = async (id, dados) => {
  const url = id ? `/api/resource/Alongamento/${encodeURIComponent(id)}` : '/api/resource/Alongamento'
  const res = await client[id ? 'put' : 'post'](url, dados)
  return res.data?.data
}

export const excluirAlongamento = async (id) => {
  await client.delete(`/api/resource/Alongamento/${encodeURIComponent(id)}`)
}

export const toggleAlongamento = async (id, enabled) => {
  const res = await client.put(`/api/resource/Alongamento/${encodeURIComponent(id)}`, { enabled })
  return res.data?.data
}

export const listarAlongamentos = async ({ limit = 200, gerenciar = false } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const filters = [['Alongamento', 'owner', 'in', owners]]
  if (!gerenciar) filters.push(['Alongamento', 'enabled', '=', 1])
  const fields = ['name', 'nome_do_exercício', 'video', 'plataforma_do_vídeo']
  if (gerenciar) fields.push('enabled', 'owner')
  const res = await client.get('/api/resource/Alongamento', {
    params: { fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit },
  })
  return res.data?.data || []
}

export const salvarAerobico = async (id, dados) => {
  const url = id ? `/api/resource/Exercicio%20Aerobico/${encodeURIComponent(id)}` : '/api/resource/Exercicio%20Aerobico'
  const res = await client[id ? 'put' : 'post'](url, dados)
  return res.data?.data
}

export const excluirAerobico = async (id) => {
  await client.delete(`/api/resource/Exercicio%20Aerobico/${encodeURIComponent(id)}`)
}

export const toggleAerobico = async (id, enabled) => {
  const res = await client.put(`/api/resource/Exercicio%20Aerobico/${encodeURIComponent(id)}`, { enabled })
  return res.data?.data
}

export const listarAerobicos = async ({ limit = 200, gerenciar = false } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const filters = [['Exercicio Aerobico', 'owner', 'in', owners]]
  if (!gerenciar) filters.push(['Exercicio Aerobico', 'enabled', '=', 1])
  const fields = ['name', 'exercicio_aerobico', 'video', 'plataforma_do_vídeo']
  if (gerenciar) fields.push('enabled', 'owner')
  const res = await client.get('/api/resource/Exercicio%20Aerobico', {
    params: { fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit },
  })
  return res.data?.data || []
}

export const listarExercicios = async ({ limit = 500 } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const res = await client.get('/api/resource/Treino%20Exercicio', {
    params: {
      fields: JSON.stringify([
        'name', 'creation', 'owner', 'nome_do_exercicio', 'grupo_muscular',
        'video', 'plataforma_do_vídeo', 'intensidade_json', 'enabled',
      ]),
      filters: JSON.stringify([
        ['enabled', '=', 1],
        ['owner', 'in', owners],
      ]),
      limit,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
