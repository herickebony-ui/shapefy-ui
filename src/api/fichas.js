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

export const listarAlongamentos = async ({ limit = 200 } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const res = await client.get('/api/resource/Alongamento', {
    params: {
      fields: JSON.stringify(['name', 'nome_do_exercício', 'video', 'plataforma_do_vídeo']),
      filters: JSON.stringify([
        ['Alongamento', 'enabled', '=', 1],
        ['Alongamento', 'owner', 'in', owners],
      ]),
      limit,
    },
  })
  return res.data?.data || []
}

export const listarAerobicos = async ({ limit = 200 } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const res = await client.get('/api/resource/Exercicio Aerobico', {
    params: {
      fields: JSON.stringify(['name', 'exercicio_aerobico', 'video', 'plataforma_do_vídeo']),
      filters: JSON.stringify([
        ['Exercicio Aerobico', 'enabled', '=', 1],
        ['Exercicio Aerobico', 'owner', 'in', owners],
      ]),
      limit,
    },
  })
  return res.data?.data || []
}

export const listarExercicios = async ({ limit = 500 } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_COMPARTILHADOS] : OWNERS_COMPARTILHADOS
  const res = await client.get('/api/resource/Treino Exercicio', {
    params: {
      fields: JSON.stringify([
        'name', 'creation', 'owner', 'nome_do_exercicio', 'grupo_muscular',
        'video', 'plataforma_do_vídeo', 'intensidade_json', 'enabled',
      ]),
      filters: JSON.stringify([
        ['Treino Exercicio', 'enabled', '=', 1],
        ['Treino Exercicio', 'owner', 'in', owners],
      ]),
      limit,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
