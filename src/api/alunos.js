import client from './client'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const criarAluno = async (campos) => {
  const res = await client.post('/api/resource/Aluno', {
    profissional: profissionalLogado(),
    ...campos,
  })
  return res.data.data
}

export const listarAlunos = async ({ search = '', enabled = '', sexo = '', page = 1, limit = 20 } = {}) => {
  const filtros = [["profissional", "=", profissionalLogado()]]
  if (search) {
    filtros.push(["nome_completo", "like", `%${search}%`])
  } else {
    if (enabled !== '') filtros.push(["enabled", "=", Number(enabled)])
    if (sexo) filtros.push(["sexo", "=", sexo])
  }
  const params = {
    fields: JSON.stringify(["name","nome_completo","email","telefone","foto","enabled","dieta","treino","sexo","age","data_nascimento","height","weight","creation","plan_start","plan_end","formulario_padrao"]),
    filters: JSON.stringify(filtros),
    limit: search ? 200 : limit,
    limit_start: search ? 0 : (page - 1) * limit,
    order_by: 'creation desc',
  }
  const res = await client.get('/api/resource/Aluno', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === (search ? 200 : limit) }
}

export const buscarStatsAlunos = async () => {
  const res = await client.get('/api/method/shapefy.api.api.get_aluno_stats')
  return res.data.message
}

export const buscarAluno = async (id) => {
  const res = await client.get(`/api/resource/Aluno/${id}`)
  const aluno = res.data.data
  // Defesa multi-tenant: se vier aluno de outro profissional, devolve null
  if (aluno && aluno.profissional && aluno.profissional !== profissionalLogado()) {
    return null
  }
  return aluno
}

export const listarAlunosByIds = async (ids = []) => {
  const unicos = [...new Set(ids.filter(Boolean))]
  if (!unicos.length) return []
  const params = {
    fields: JSON.stringify(['name', 'nome_completo', 'foto', 'telefone', 'enabled', 'plan_start', 'plan_end', 'plan_duration']),
    filters: JSON.stringify([
      ['profissional', '=', profissionalLogado()],
      ['name', 'in', unicos],
    ]),
    limit: unicos.length,
  }
  const res = await client.get('/api/resource/Aluno', { params })
  return res.data.data || []
}

export const salvarAluno = async (id, campos) => {
  const res = await client.put(`/api/resource/Aluno/${id}`, campos)
  return res.data.data
}

export const excluirAluno = async (id) => {
  await client.delete(`/api/resource/Aluno/${id}`)
}