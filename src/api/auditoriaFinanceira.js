import client from './client'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarAuditorias = async ({ aluno = '', acao = '', dataInicio = '', dataFim = '', limit = 100 } = {}) => {
  const filtros = { profissional: profissionalLogado() }
  if (aluno) filtros.aluno = aluno
  if (acao) filtros.acao = acao
  if (dataInicio) filtros.data_inicio = dataInicio
  if (dataFim) filtros.data_fim = dataFim

  const res = await client.post('/api/method/shapefy.financeiro.api.listar_auditorias', {
    filtros,
    limit,
  })
  return res.data.message || []
}
