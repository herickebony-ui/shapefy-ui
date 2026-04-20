import client from './client'

const frappeOwner = () => localStorage.getItem('frappe_user') || ''
const OWNERS_BASE = ['Administrator', 'teste@shapefy.com']

// ─── Dietas ───────────────────────────────────────────────────────────────────

export const listarDietas = async ({ alunoId, busca, kcalMin, kcalMax, page = 1, limit = 20 } = {}) => {
  const params = {
    fields: JSON.stringify([
      "name", "date", "final_date", "creation",
      "aluno", "nome_completo", "profissional",
      "strategy", "week_days", "total_calories",
      "meal_1", "meal_2", "meal_3", "meal_4",
      "meal_5", "meal_6", "meal_7", "meal_8",
      "meal_1_label", "meal_2_label", "meal_3_label", "meal_4_label",
      "meal_5_label", "meal_6_label", "meal_7_label", "meal_8_label"
    ]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  const filtros = []
  if (alunoId) filtros.push(["aluno", "=", alunoId])
  if (busca) filtros.push(["nome_completo", "like", `%${busca}%`])
  if (kcalMin) filtros.push(["total_calories", ">=", Number(kcalMin)])
  if (kcalMax) filtros.push(["total_calories", "<=", Number(kcalMax)])
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
  const dieta = await buscarDieta(id)
  const { name, creation, modified, modified_by, owner, docstatus, idx,
    _user_tags, _comments, _assign, _liked_by, nome_completo, ...payload } = dieta

  if (novoAluno) payload.aluno = novoAluno
  if (dataInicial !== null) payload.date = dataInicial
  if (dataFinal !== null) payload.final_date = dataFinal

  for (let i = 1; i <= 8; i++) {
    for (let j = 1; j <= 10; j++) {
      const field = `meal_${i}_option_${j}_items`
      if (payload[field]) {
        payload[field] = payload[field].map(({ name: _n, ...item }) => item)
      }
    }
  }

  return criarDieta(payload)
}

// ─── Alimentos ────────────────────────────────────────────────────────────────

export const listarAlimentos = async ({ busca = '', grupo = '', page = 1, limit = 50 } = {}) => {
  const filters = [['enabled', '=', 1]]
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

export const listarRefeicoesProntas = async ({ busca = '', enabled = '', page = 1, limit = 30 } = {}) => {
  const owner = frappeOwner()
  const owners = owner ? [owner, ...OWNERS_BASE] : OWNERS_BASE

  const filters = [['owner', 'in', owners]]
  if (busca) filters.push(['full_name', 'like', `%${busca}%`])
  if (enabled !== '') filters.push(['enabled', '=', Number(enabled)])

  const data = new URLSearchParams({
    doctype: 'Refeicoes',
    fields: JSON.stringify(['name', 'full_name', 'enabled', 'public', 'profissional', 'creation']),
    filters: JSON.stringify(filters),
    limit_start: (page - 1) * limit,
    limit_page_length: limit,
    order_by: 'creation desc',
  })

  const res = await client.post('/api/method/frappe.desk.reportview.get', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const result = res.data.message
  const list = result?.values?.map(row =>
    Object.fromEntries(result.keys.map((k, i) => [k, row[i]]))
  ) || []
  return { list, hasMore: list.length === limit }
}

export const buscarRefeicaoPronta = async (id) => {
  const res = await client.get(`/api/resource/Refeicoes/${encodeURIComponent(id)}`)
  return res.data.data
}

export const salvarRefeicaoPronta = async (id, campos) => {
  const res = await client.put(`/api/resource/Refeicoes/${encodeURIComponent(id)}`, campos)
  return res.data.data
}

export const criarRefeicaoPronta = async (campos) => {
  const res = await client.post('/api/resource/Refeicoes', campos)
  return res.data.data
}

export const excluirRefeicaoPronta = async (id) => {
  await client.delete(`/api/resource/Refeicoes/${encodeURIComponent(id)}`)
}

export const toggleRefeicaoPronta = async (id, enabled) => {
  const res = await client.put(`/api/resource/Refeicoes/${encodeURIComponent(id)}`, { enabled })
  return res.data.data
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