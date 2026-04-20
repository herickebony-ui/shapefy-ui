import client from './client'

export const listarAnamneses = async ({ alunoId, page = 1, limit = 50 } = {}) => {
  const params = {
    fields: JSON.stringify(["name","titulo","status","date","enviar_aluno","aluno_preencheu","aluno"]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (alunoId) params.filters = JSON.stringify([["aluno","=", alunoId]])
  const res = await client.get('/api/resource/Anamnese', { params })
  return { list: res.data.data || [] }
}

export const listarAnamnesesPorAlunos = async (ids) => {
  if (!ids.length) return []
  const res = await client.get('/api/resource/Anamnese', {
    params: {
      fields: JSON.stringify(["name","titulo","status","aluno"]),
      filters: JSON.stringify([["aluno","in", ids]]),
      limit: ids.length * 10,
      order_by: 'creation desc',
    }
  })
  return res.data.data || []
}

export const excluirAnamnese = async (id) => {
  await client.delete(`/api/resource/Anamnese/${encodeURIComponent(id)}`)
}

export const buscarAnamnese = async (id) => {
  const res = await client.get(`/api/resource/Anamnese/${id}`)
  return res.data.data
}

export const salvarAnamnese = async (id, perguntas) => {
  const res = await client.put(`/api/resource/Anamnese/${id}`, {
    perguntas_e_respostas: perguntas
  })
  return res.data.data
}

export const listarFormularios = async () => {
  const res = await client.get('/api/resource/Formulario%20de%20Anamnese', {
    params: {
      fields: JSON.stringify(["name","titulo"]),
      limit: 50, order_by: 'creation desc'
    }
  })
  return { list: res.data.data || [] }
}

export const vincularAnamnese = async (alunoId, formulario, enviarAluno = true) => {
  const data = new URLSearchParams({
    aluno: alunoId,
    formulario,
    enviar_aluno: enviarAluno ? 1 : 0,
  })
  const res = await client.post('/api/method/shapefy.api_shapefy.vincular_anamnese', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data.message
}