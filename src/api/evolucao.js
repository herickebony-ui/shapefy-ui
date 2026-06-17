import client from './client'

// Registro de Evolução Física — fonte única de peso/foto/medida na timeline.
// Doctype: "Registro de Evolucao Fisica" (+ child "Registro Evolucao Foto").

const DOCTYPE = 'Registro%20de%20Evolucao%20Fisica'

// Timeline completa (registros + fotos) numa requisição só — evita N+1.
export const timelineEvolucao = async (alunoId) => {
  const res = await client.get('/api/method/shapefy.evolucao.api.timeline_evolucao', {
    params: { aluno: alunoId },
  })
  return res.data?.message || { nome: '', registros: [] }
}

export const listarRegistrosPorAluno = async (alunoId) => {
  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(['*']),
      filters: JSON.stringify([['aluno', '=', alunoId]]),
      limit: 500,
      order_by: 'data asc',
    },
  })
  return res.data.data || []
}

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

// Feed de Registros do profissional — lista estilo feedback. Filtra por aluno se passado.
// limitStart: offset pra paginação server-side (feed geral pagina do back).
export const listarRegistros = async ({ aluno, alunos, origem = '', limit = 300, limitStart = 0 } = {}) => {
  const filtros = [['profissional', '=', profissionalLogado()]]
  if (aluno) filtros.push(['aluno', '=', aluno])
  if (alunos && alunos.length) filtros.push(['aluno', 'in', alunos])
  if (origem) filtros.push(['origem', '=', origem])
  const res = await client.get(`/api/resource/${DOCTYPE}`, {
    params: {
      fields: JSON.stringify(['name', 'aluno', 'data', 'origem', 'peso', 'conjunto_origem']),
      filters: JSON.stringify(filtros),
      limit,
      limit_start: limitStart,
      order_by: 'data desc',
    },
  })
  return res.data.data || []
}

export const buscarRegistro = async (id) => {
  const res = await client.get(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
  return res.data.data
}

// Conta fotos por registro (pra sinalizar foto vs só-peso na lista) numa query só.
// Retorna { [registroName]: qtdFotos }.
export const contarFotos = async (registroNames = []) => {
  if (!registroNames.length) return {}
  const res = await client.get('/api/resource/Registro%20Evolucao%20Foto', {
    params: {
      fields: JSON.stringify(['parent']),
      filters: JSON.stringify([['parent', 'in', registroNames]]),
      limit: 0,
    },
  })
  const counts = {}
  for (const r of res.data.data || []) counts[r.parent] = (counts[r.parent] || 0) + 1
  return counts
}

// Lançamento manual retroativo (origem=manual): aluno + data passada + peso + fotos.
export const criarRegistroManual = async (payload) => {
  const res = await client.post(`/api/resource/${DOCTYPE}`, { origem: 'manual', ...payload })
  return res.data.data
}

export const salvarRegistro = async (id, payload) => {
  const res = await client.put(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`, payload)
  return res.data.data
}

export const excluirRegistro = async (id) => {
  await client.delete(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
}

// Peso atual derivado do aluno logado (endpoint backend — Registro mais recente).
export const pesoAtualAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.peso_atual')
  return res.data?.message?.peso ?? null
}

// Pendências de migração: Registros de feedback sem peso (valor cru não interpretado).
export const listarPendenciasPeso = async () => {
  const res = await client.get('/api/method/shapefy.evolucao.api.pendencias_peso')
  return res.data?.message || []
}
