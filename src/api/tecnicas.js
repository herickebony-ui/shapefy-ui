import client from './client'

export const listarTecnicas = async ({ limit = 1000 } = {}) => {
  const res = await client.get('/api/resource/Tecnica Intensificadora', {
    params: {
      fields: JSON.stringify(['name', 'nome', 'descricao', 'video', 'plataforma_do_vídeo', 'enabled', 'biblioteca_source']),
      filters: JSON.stringify([['Tecnica Intensificadora', 'enabled', '=', 1]]),
      limit,
      order_by: 'nome asc',
    },
  })
  return res.data?.data || []
}

export const listarTodasTecnicas = async ({ limit = 1000 } = {}) => {
  const res = await client.get('/api/resource/Tecnica Intensificadora', {
    params: {
      fields: JSON.stringify(['name', 'nome', 'descricao', 'video', 'plataforma_do_vídeo', 'enabled', 'biblioteca_source', 'profissional']),
      filters: JSON.stringify([['Tecnica Intensificadora', 'profissional', '!=', '']]),
      limit,
      order_by: 'nome asc',
    },
  })
  return res.data?.data || []
}

export const salvarTecnica = async (name, payload) => {
  if (name) {
    const res = await client.put(`/api/resource/Tecnica Intensificadora/${encodeURIComponent(name)}`, payload)
    return res.data?.data
  }
  const res = await client.post('/api/resource/Tecnica Intensificadora', payload)
  return res.data?.data
}

export const excluirTecnica = async (name) => {
  await client.delete(`/api/resource/Tecnica Intensificadora/${encodeURIComponent(name)}`)
}
