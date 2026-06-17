import client from './client'
import { filtrosBusca } from '../utils/strings'

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
    filtros.push(...filtrosBusca('nome_completo', search))
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
  // Chunk: um `in` com centenas de IDs estoura o querystring (URL muito longa →
  // 414/falha). Quebra em lotes e junta os resultados.
  const CHUNK = 80
  const fields = JSON.stringify(['name', 'nome_completo', 'foto', 'telefone', 'enabled', 'plan_start', 'plan_end', 'plan_duration'])
  const lotes = []
  for (let i = 0; i < unicos.length; i += CHUNK) lotes.push(unicos.slice(i, i + CHUNK))
  const resultados = await Promise.all(lotes.map(lote =>
    client.get('/api/resource/Aluno', {
      params: {
        fields,
        filters: JSON.stringify([
          ['profissional', '=', profissionalLogado()],
          ['name', 'in', lote],
        ]),
        limit: lote.length,
      },
    }).then(res => res.data.data || []).catch(() => [])
  ))
  return resultados.flat()
}

export const salvarAluno = async (id, campos) => {
  const res = await client.put(`/api/resource/Aluno/${id}`, campos)
  return res.data.data
}

export const excluirAluno = async (id) => {
  await client.delete(`/api/resource/Aluno/${id}`)
}