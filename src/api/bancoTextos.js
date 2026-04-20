import client from './client'

const encode = (dt) => encodeURIComponent(dt)

export const CATEGORIAS = [
  {
    id: 'instrucoes_treino',
    label: 'Instruções de Treino',
    doctype: 'Treino Observacao',
    campo: 'treino_observacao',
    extra: null,
  },
  {
    id: 'obs_alongamentos',
    label: 'Observações Alongamentos',
    doctype: 'Alongamento Observacao',
    campo: 'alongamento_observacao',
    extra: null,
  },
  {
    id: 'instrucoes_aerobicos',
    label: 'Instruções Aeróbicos',
    doctype: 'Instrucao Aerobico',
    campo: 'instrucao_aerobico',
    extra: null,
  },
  {
    id: 'frequencia_aerobicos',
    label: 'Frequências Aeróbicos',
    doctype: 'Frequencia Aerobico',
    campo: 'frequencia_aerobico',
    extra: null,
  },
  {
    id: 'legendas_refeicoes',
    label: 'Legendas das Refeições',
    doctype: 'Legendas',
    campo: 'legend',
    extra: 'full_name',
  },
]

export const listarTextos = async (doctype, campo, { busca, apenasAtivos = true, extra = null } = {}) => {
  const fields = ['name', campo, 'enabled']
  if (extra) fields.push(extra)

  const filters = []
  if (apenasAtivos) filters.push(['enabled', '=', 1])
  if (busca) filters.push([campo, 'like', `%${busca}%`])

  const res = await client.get(`/api/resource/${encode(doctype)}`, {
    params: {
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit: 500,
      order_by: `${campo} asc`,
    },
  })
  return res.data.data || []
}

export const listarTodosTextos = async (doctype, campo, { busca, extra = null } = {}) => {
  const fields = ['name', campo, 'enabled']
  if (extra) fields.push(extra)

  const filters = []
  if (busca) filters.push([campo, 'like', `%${busca}%`])

  const res = await client.get(`/api/resource/${encode(doctype)}`, {
    params: {
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit: 500,
      order_by: `${campo} asc`,
    },
  })
  return res.data.data || []
}

export const criarTexto = async (doctype, campo, texto, extra = {}) => {
  const res = await client.post(`/api/resource/${encode(doctype)}`, {
    [campo]: texto,
    enabled: 1,
    ...extra,
  })
  return res.data.data
}

export const editarTexto = async (doctype, id, campos) => {
  const res = await client.put(
    `/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`,
    campos,
  )
  return res.data.data
}

export const toggleTexto = async (doctype, id, enabled) => {
  const res = await client.put(
    `/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`,
    { enabled: enabled ? 1 : 0 },
  )
  return res.data.data
}

export const excluirTexto = async (doctype, id) => {
  await client.delete(`/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`)
}

// Salva no banco apenas se não existir entrada normalizada igual.
// Normalização: trim + lowercase + remove pontuação final + colapsa espaços.
const norm = (s) =>
  (s || '').trim().toLowerCase().replace(/[.,;:!?]+$/, '').replace(/\s+/g, ' ')

export const salvarNoBancoSeNovo = async (doctype, campo, valor, extra = {}) => {
  if (!valor?.trim()) return
  const normalizado = norm(valor)
  try {
    const existentes = await listarTextos(doctype, campo, { apenasAtivos: true })
    const jaExiste = existentes.some(item => norm(item[campo] || '') === normalizado)
    if (!jaExiste) await criarTexto(doctype, campo, valor.trim(), extra)
  } catch (e) {
    console.warn(`Banco de textos sync [${doctype}]:`, e.message)
  }
}
