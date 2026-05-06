import client from './client'

// DocType: Notificacao Aluno
// Campos: aluno (FK), titulo, descricao, visualizado (0/1)
//
// Usado pra avisar o aluno no app sobre eventos do profissional —
// ex: plano disponível, dieta/ficha atualizada, feedback liberado.

export const criarNotificacaoAluno = async ({ aluno, titulo, descricao }) => {
  if (!aluno) throw new Error('aluno é obrigatório')
  const res = await client.post('/api/resource/Notificacao Aluno', {
    aluno,
    titulo: titulo || '',
    descricao: descricao || '',
    visualizado: 0,
  })
  return res.data?.data
}

export const listarNotificacoesAluno = async (alunoId, { limit = 50 } = {}) => {
  const res = await client.get('/api/resource/Notificacao Aluno', {
    params: {
      fields: JSON.stringify(['name', 'titulo', 'descricao', 'visualizado', 'creation']),
      filters: JSON.stringify([['aluno', '=', alunoId]]),
      limit,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
