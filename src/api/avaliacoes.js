import client from './client'

const DOCTYPE = 'Avaliacao%20da%20Composicao%20Corporal'
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const LIST_FIELDS = [
  'name', 'aluno', 'nome_completo', 'date', 'weight',
  'jp7_body_fat', 'jp3_body_fat', 'jp4_body_fat', 'faulkner_body_fat', 'guedes_body_fat',
  'skinfold_triceps', 'skinfold_subscapular', 'skinfold_suprailiac', 'skinfold_abdominal',
  'lean_mass', 'fat_mass', 'bmi', 'whr',
]

export const listarAvaliacoes = async ({ busca, page = 1, limit = 50 } = {}) => {
  const filters = [['profissional', '=', profissionalLogado()]]
  if (busca) filters.push(['nome_completo', 'like', `%${busca}%`])
  const params = {
    fields: JSON.stringify(LIST_FIELDS),
    filters: JSON.stringify(filters),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'date desc',
  }
  const res = await client.get(`/api/resource/${DOCTYPE}`, { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const listarAvaliacoesPorAluno = async (alunoId) => {
  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(['*']),
      filters: JSON.stringify([['aluno', '=', alunoId]]),
      limit: 200,
      order_by: 'date asc',
    },
  })
  return res.data.data || []
}

export const criarAvaliacao = async (payload) => {
  const res = await client.post(`/api/resource/${DOCTYPE}`, {
    profissional: profissionalLogado(),
    ...payload,
  })
  return res.data.data
}

export const excluirAvaliacao = async (id) => {
  await client.delete(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
}
