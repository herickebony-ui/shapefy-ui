import client from './client'

// `momento_de_uso` é um campo OPCIONAL no DocType Manipulados. Se o admin ainda
// não criou (Link → "Momento de Uso"), os reads abaixo fazem fallback automático
// sem o campo, e writes simplesmente não o incluem. Quando o campo existir, tudo
// passa a funcionar sem alteração no front.

const FIELDS_BASE = ['name', 'full_name', 'description']
const FIELDS_FULL = [...FIELDS_BASE, 'momento_de_uso']

// Cache em memória — false inicialmente; vira true se o backend aceitar o campo.
let momentoDeUsoDisponivel = null // null | true | false

const ehErroDeColuna = (e) => {
  const exc = e?.response?.data?.exception || ''
  return /InvalidColumnName|Unknown column|momento_de_uso/i.test(exc)
}

const get = async (params) => {
  return await client.get('/api/resource/Manipulados', { params })
}

const getComFallback = async (baseParams) => {
  const fields = momentoDeUsoDisponivel === false ? FIELDS_BASE : FIELDS_FULL
  try {
    const res = await get({ ...baseParams, fields: JSON.stringify(fields) })
    if (momentoDeUsoDisponivel === null) momentoDeUsoDisponivel = true
    return res
  } catch (e) {
    if (momentoDeUsoDisponivel === null && ehErroDeColuna(e)) {
      momentoDeUsoDisponivel = false
      return await get({ ...baseParams, fields: JSON.stringify(FIELDS_BASE) })
    }
    throw e
  }
}

export const buscarManipulados = async (busca = '', limit = 20) => {
  const filters = [['enabled', '=', 1]]
  if (busca) filters.push(['full_name', 'like', `%${busca}%`])
  const res = await getComFallback({
    filters: JSON.stringify(filters),
    limit,
    order_by: 'full_name asc',
  })
  return res.data?.data || []
}

export const listarManipulados = async () => {
  const res = await getComFallback({
    filters: JSON.stringify([]),
    limit: 200,
    order_by: 'full_name asc',
  })
  return res.data?.data || []
}

export const criarManipulado = async ({ full_name, description, momento_de_uso }) => {
  const payload = { full_name, description, enabled: 1 }
  if (momento_de_uso) payload.momento_de_uso = momento_de_uso
  const res = await client.post('/api/resource/Manipulados', payload)
  return res.data?.data
}

export const salvarManipulado = async (name, { full_name, description, momento_de_uso, enabled }) => {
  const payload = { full_name, description, enabled }
  if (momento_de_uso !== undefined) payload.momento_de_uso = momento_de_uso || null
  const res = await client.put(`/api/resource/Manipulados/${encodeURIComponent(name)}`, payload)
  return res.data?.data
}

export const excluirManipulado = async (name) => {
  await client.delete(`/api/resource/Manipulados/${encodeURIComponent(name)}`)
}
