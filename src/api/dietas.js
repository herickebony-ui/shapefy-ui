import client from './client'

// ─── Dietas ───────────────────────────────────────────────────────────────────

export const listarDietas = async ({ alunoId, busca, page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify([
      "name", "date", "final_date",
      "aluno", "nome_completo", "profissional",
      "strategy", "week_days", "total_calories"
    ]),
    limit,
    limit_start: (page - 1) * limit,
  }
  const filtros = []
  if (alunoId) filtros.push(["aluno", "=", alunoId])
  if (busca) filtros.push(["nome_completo", "like", `%${busca}%`])
  if (filtros.length) params.filters = JSON.stringify(filtros)

  const res = await client.get('/api/resource/Dieta', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarDieta = async (id) => {
  const res = await client.get(`/api/resource/Dieta/${id}`)
  return res.data.data
}

export const criarDieta = async (campos) => {
  const res = await client.post('/api/resource/Dieta', campos)
  return res.data.data
}

export const salvarDieta = async (id, campos) => {
  const res = await client.put(`/api/resource/Dieta/${id}`, campos)
  return res.data.data
}

export const excluirDieta = async (id) => {
  await client.delete(`/api/resource/Dieta/${id}`)
}

export const duplicarDieta = async (id, novoAluno = null, dataInicial = null, dataFinal = null) => {
  const res = await client.post('/api/method/shapefy.api.duplicar_dieta', {
    id,
    novo_aluno: novoAluno,
    data_inicial: dataInicial,
    data_final: dataFinal
  })
  return res.data.message
}

// ─── Alimentos ────────────────────────────────────────────────────────────────

export const listarAlimentos = async ({ busca = '', grupo = '', page = 1, limit = 50 } = {}) => {
  const filters = []
  if (busca) filters.push(["food", "like", `%${busca}%`])
  if (grupo) filters.push(["food_group", "=", grupo])

  const data = new URLSearchParams({
    doctype: 'Alimento',
    fields: JSON.stringify(["name", "food", "calories", "protein",
      "carbohydrate", "lipid", "fiber", "food_group", "ref_weight", "unit"]),
    filters: JSON.stringify(filters),
    limit_start: (page - 1) * limit,
    limit_page_length: limit,
    order_by: 'food asc',
  })

  const res = await client.post('/api/method/frappe.desk.reportview.get', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  const result = res.data.message
  const list = result?.values?.map(row =>
    Object.fromEntries(result.keys.map((k, i) => [k, row[i]]))
  ) || []
  return { list, hasMore: list.length === limit }
}

export const buscarAlimento = async (id) => {
  const res = await client.get(`/api/resource/Alimento/${id}`)
  return res.data.data
}

// ─── Grupos Alimentares ───────────────────────────────────────────────────────

export const listarGrupos = async () => {
  const res = await client.get('/api/resource/Grupo%20Alimentar', {
    params: {
      fields: JSON.stringify(["name", "grupo"]),
      limit: 100,
      order_by: 'grupo asc'
    }
  })
  return res.data.data || []
}

// ─── Refeições Prontas ────────────────────────────────────────────────────────

export const listarRefeicoesProntas = async ({ busca = '', page = 1, limit = 50 } = {}) => {
  const params = {
    fields: JSON.stringify(["name", "full_name", "creation"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (busca) params.filters = JSON.stringify([["full_name", "like", `%${busca}%`]])

  const res = await client.get('/api/resource/Ref%20Pronta', { params })
  const list = res.data.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarRefeicaoPronta = async (id) => {
  const res = await client.get(`/api/resource/Ref%20Pronta/${id}`)
  return res.data.data
}

export const salvarRefeicaoPronta = async (id, campos) => {
  const res = await client.put(`/api/resource/Ref%20Pronta/${id}`, campos)
  return res.data.data
}

export const criarRefeicaoPronta = async (campos) => {
  const res = await client.post('/api/resource/Ref%20Pronta', campos)
  return res.data.data
}

export const excluirRefeicaoPronta = async (id) => {
  await client.delete(`/api/resource/Ref%20Pronta/${id}`)
}

// ─── Medidas Caseiras ─────────────────────────────────────────────────────────

export const listarMedidasCaseiras = async (alimentoId) => {
  const res = await client.get('/api/resource/Medida%20Caseira', {
    params: {
      fields: JSON.stringify(["name", "medida", "quantidade", "alimento"]),
      filters: JSON.stringify([["alimento", "=", alimentoId]]),
      limit: 50
    }
  })
  return res.data.data || []
}