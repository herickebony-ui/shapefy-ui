import client from './client'

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

export const listarAlongamentos = async ({ limit = 500 } = {}) => {
  const res = await client.get('/api/resource/Exercicio de Alongamento', {
    params: {
      fields: JSON.stringify(['name', 'nome_do_exercício', 'video', 'plataforma_do_vídeo']),
      filters: '[]',
      limit,
    },
  })
  return res.data?.data || []
}

export const listarAerobicos = async ({ limit = 500 } = {}) => {
  const res = await client.get('/api/resource/Exercicio Aerobico', {
    params: {
      fields: JSON.stringify(['name', 'exercicio_aerobico', 'video', 'plataforma_do_vídeo', 'instrucao']),
      filters: '[]',
      limit,
    },
  })
  return res.data?.data || []
}

export const listarExercicios = async ({ limit = 500 } = {}) => {
  const res = await client.get('/api/resource/Exercicio', {
    params: {
      fields: JSON.stringify([
        'name', 'nome_do_exercicio', 'grupo_muscular',
        'video', 'plataforma_do_vídeo', 'intensidade_json',
      ]),
      filters: '[]',
      limit,
    },
  })
  return res.data?.data || []
}
