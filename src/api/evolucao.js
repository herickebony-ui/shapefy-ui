import client from './client'

// Registro de Evolução Física — fonte única de peso/foto/medida na timeline.
// Doctype: "Registro de Evolucao Fisica" (+ child "Registro Evolucao Foto").

const DOCTYPE = 'Registro%20de%20Evolucao%20Fisica'

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

export const buscarRegistro = async (id) => {
  const res = await client.get(`/api/resource/${DOCTYPE}/${encodeURIComponent(id)}`)
  return res.data.data
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
