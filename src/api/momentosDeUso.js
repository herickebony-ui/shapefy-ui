import client from './client'
import { filtrosBusca } from '../utils/strings'

// DocType: Momento de Uso
// Campos: nome_do_momento (Data, único — também é o `name`), profissional (Link User,
// auto-preenchido pelo backend), ordem (Int, opcional).
// Multi-tenant: o backend filtra automaticamente por profissional logado.

const ENC = encodeURIComponent('Momento de Uso')

export const buscarMomentosDeUso = async (busca = '', limit = 20) => {
  const filters = []
  if (busca) filters.push(...filtrosBusca('nome_do_momento', busca))
  const res = await client.get(`/api/resource/${ENC}`, {
    params: {
      fields: JSON.stringify(['name', 'nome_do_momento', 'ordem']),
      filters: JSON.stringify(filters),
      limit,
      order_by: 'ordem asc, nome_do_momento asc',
    },
  })
  return res.data?.data || []
}

export const listarMomentosDeUso = async () => {
  const res = await client.get(`/api/resource/${ENC}`, {
    params: {
      fields: JSON.stringify(['name', 'nome_do_momento', 'ordem']),
      limit: 200,
      order_by: 'ordem asc, nome_do_momento asc',
    },
  })
  return res.data?.data || []
}

export const criarMomentoDeUso = async ({ nome_do_momento, ordem = 0 }) => {
  const res = await client.post(`/api/resource/${ENC}`, { nome_do_momento, ordem })
  return res.data?.data
}

export const salvarMomentoDeUso = async (name, { nome_do_momento, ordem }) => {
  const res = await client.put(`/api/resource/${ENC}/${encodeURIComponent(name)}`, {
    nome_do_momento,
    ordem,
  })
  return res.data?.data
}

export const excluirMomentoDeUso = async (name) => {
  await client.delete(`/api/resource/${ENC}/${encodeURIComponent(name)}`)
}

// Garante que `valor` (texto livre digitado pelo profissional) existe no catálogo.
// Devolve o `name` válido para usar como Link. Silencia DuplicateEntryError (já existe).
export const garantirMomentoDeUso = async (valor) => {
  const nome = (valor || '').trim()
  if (!nome) return ''
  try {
    const novo = await criarMomentoDeUso({ nome_do_momento: nome })
    return novo?.name || nome
  } catch (e) {
    const status = e?.response?.status
    const exc = e?.response?.data?.exception || ''
    if (status === 409 || exc.includes('DuplicateEntryError')) return nome
    throw e
  }
}
