import client from './client'

// DocType: Notificacao Aluno
// Campos: aluno (FK), titulo, descricao, url (opcional, ex: "/fichas"),
// agendado_para (datetime opcional — vazio = envia imediato; data futura = agenda),
// status (read-only — backend gerencia: Imediata/Agendada/Enviada/Falha), visualizado (0/1).
//
// Usado pra avisar o aluno no app sobre eventos do profissional —
// ex: plano disponível, dieta/ficha atualizada, feedback liberado.

export const criarNotificacaoAluno = async ({ aluno, titulo, descricao, url = '', agendado_para = null }) => {
  if (!aluno) throw new Error('aluno é obrigatório')
  const payload = {
    aluno,
    titulo: titulo || '',
    descricao: descricao || '',
    visualizado: 0,
  }
  if (url) payload.url = url
  if (agendado_para) payload.agendado_para = agendado_para
  const res = await client.post('/api/resource/Notificacao Aluno', payload)
  return res.data?.data
}

export const listarNotificacoesAluno = async (alunoId, { limit = 50 } = {}) => {
  const res = await client.get('/api/resource/Notificacao Aluno', {
    params: {
      fields: JSON.stringify(['name', 'titulo', 'descricao', 'visualizado', 'status', 'agendado_para', 'creation']),
      filters: JSON.stringify([['aluno', '=', alunoId]]),
      limit,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
