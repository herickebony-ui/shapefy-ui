import client from './client'

export const importarDaBiblioteca = async (doctype, names) => {
  const res = await client.post('/api/method/shapefy.api.api.importar_da_biblioteca', { doctype, names })
  return res.data.message
}

export const listarBibliotecaDisponivel = async ({ doctype, busca = '', grupo = '', page = 1, pageSize = 50 } = {}) => {
  const params = { doctype, page, page_size: pageSize }
  if (busca) params.busca = busca
  if (grupo) params.grupo = grupo
  const res = await client.get('/api/method/shapefy.api.api.listar_biblioteca_disponivel', { params })
  const data = res.data?.message ?? res.data ?? {}
  return {
    items: data.items || [],
    total: data.total || 0,
    page: data.page || page,
    pageSize: data.page_size || pageSize,
  }
}
