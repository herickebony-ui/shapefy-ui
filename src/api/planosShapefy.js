import client from './client'

const ENC_DOCTYPE = encodeURIComponent('Plano Shapefy')
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarPlanos = async ({ search = '', page = 1, limit = 20, ativo = null } = {}) => {
  const filtros = [['profissional', '=', profissionalLogado()]]
  if (search) filtros.push(['nome_plano', 'like', `%${search}%`])
  if (ativo !== null) filtros.push(['ativo', '=', ativo ? 1 : 0])

  const params = {
    fields: JSON.stringify(['name', 'nome_plano', 'cor', 'ativo', 'profissional']),
    filters: JSON.stringify(filtros),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'nome_plano asc',
  }
  const res = await client.get(`/api/resource/${ENC_DOCTYPE}`, { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarPlano = async (nomePlano) => {
  const res = await client.get(`/api/resource/${ENC_DOCTYPE}/${encodeURIComponent(nomePlano)}`)
  return res.data.data
}

export const criarPlano = async ({ nome_plano, cor = 'slate', ativo = 1, variacoes = [] }) => {
  const res = await client.post(`/api/resource/${ENC_DOCTYPE}`, {
    nome_plano,
    cor,
    ativo,
    profissional: profissionalLogado(),
    variacoes,
  })
  return res.data.data
}

export const salvarPlano = async (nomePlano, campos) => {
  const res = await client.put(`/api/resource/${ENC_DOCTYPE}/${encodeURIComponent(nomePlano)}`, campos)
  return res.data.data
}

export const excluirPlano = async (nomePlano) => {
  const res = await client.post('/api/method/shapefy.financeiro.api.excluir_plano', {
    plano_id: nomePlano,
  })
  return res.data.message
}
