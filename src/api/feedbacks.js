import client from './client'
import { criarNotificacaoAluno } from './notificacoes'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || ''

// Vincula um feedback manualmente: cria o Feedback a partir do template
// (Formulario Feedback) com aluno selecionado e dispara notificação ao aluno.
// IMPORTANTE: NÃO mandar `perguntas_e_respostas` no POST — o backend tem hook
// que copia as perguntas do template a partir do campo `formulario`. Mandar a
// child table preenchida + hook = bug (na anamnese duplicava 57+57; no feedback
// faz o status virar 'Respondido' indevidamente). Mesma lição da anamnese.
export const vincularFeedback = async (alunoId, formularioId) => {
  const [formRes, alunoRes] = await Promise.all([
    client.get(`/api/resource/Formulario%20Feedback/${encodeURIComponent(formularioId)}`),
    client.get(`/api/resource/Aluno/${encodeURIComponent(alunoId)}`),
  ])
  const template = formRes.data.data || {}
  const aluno = alunoRes.data.data || {}
  const today = new Date().toISOString().slice(0, 10)
  const res = await client.post('/api/resource/Feedback', {
    aluno: alunoId,
    formulario: formularioId,
    titulo: template.titulo || '',
    nome_completo: aluno.nome_completo || '',
    email: aluno.email || '',
    profissional: profissionalLogado(),
    date: today,
    status: 'Enviado',
  })
  const feedback = res.data?.data
  // Notifica o aluno no app — falha silenciosa pra não bloquear o vínculo.
  try {
    const nome = primeiroNome(aluno.nome_completo)
    await criarNotificacaoAluno({
      aluno: alunoId,
      titulo: nome ? `Novo feedback disponível, ${nome}!` : 'Novo feedback disponível!',
      descricao: `Preencha o feedback "${template.titulo || ''}" no app.`,
    })
  } catch (err) {
    console.warn('Não foi possível criar notificação do feedback:', err)
  }
  return feedback
}

export const listarFeedbacks = async ({ busca = '', status = '', dataInicio = '', dataFim = '', page = 1, limit = 500 } = {}) => {
  const profissional = profissionalLogado()
  const filtros = [
    ['profissional', 'in', [profissional, '']],
    ['status', '!=', 'Enviando'],
  ]
  if (busca) {
    filtros.push(['nome_completo', 'like', `%${busca}%`])
  } else {
    if (status) filtros.push(['status', '=', status])
    if (dataInicio) filtros.push(['date', '>=', dataInicio])
    if (dataFim) filtros.push(['date', '<=', dataFim])
  }

  const params = {
    fields: JSON.stringify(['name', 'formulario', 'titulo', 'aluno', 'nome_completo', 'profissional', 'date', 'status', 'email', 'modified', 'creation', 'data_resposta']),
    filters: JSON.stringify(filtros),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'modified desc',
  }
  const res = await client.get('/api/resource/Feedback', { params })
  const list = (res.data.data || []).slice().sort((a, b) => {
    const da = a.data_resposta || a.modified || ''
    const db = b.data_resposta || b.modified || ''
    return db.localeCompare(da)
  })
  return { list, hasMore: list.length === limit }
}

export const listarFormularios = async () => {
  const profissional = profissionalLogado()
  const params = {
    fields: JSON.stringify(['name', 'titulo']),
    filters: JSON.stringify([['profissional', '=', profissional], ['enabled', '=', 1]]),
    limit: 100,
    order_by: 'titulo asc',
  }
  const res = await client.get('/api/resource/Formulario Feedback', { params })
  return res.data.data || []
}

export const excluirFeedback = async (id) => {
  await client.delete(`/api/resource/Feedback/${encodeURIComponent(id)}`)
}

export const buscarFeedback = async (id) => {
  const res = await client.get(`/api/resource/Feedback/${encodeURIComponent(id)}`)
  return res.data.data
}

export const salvarStatusFeedback = async (id, status) => {
  const res = await client.put(`/api/resource/Feedback/${encodeURIComponent(id)}`, { status })
  return res.data.data
}

// Rotaciona o arquivo físico no servidor (Pillow sobrescreve no disco)
// names = array de IDs dos feedbacks sendo comparados (validação de segurança no backend)
export const rotarImagemFeedback = async (names, fileUrl, direction = 'right') => {
  const data = new URLSearchParams({
    names: JSON.stringify(names),
    file_url: fileUrl,
    direction,
  })
  await client.post('/api/method/shapefy.www.compare_feedback.rotate_image', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

// ⚠️ Nome do campo a confirmar com o DocType
export const salvarRespostaFeedback = async (id, resposta) => {
  const res = await client.put(`/api/resource/Feedback/${encodeURIComponent(id)}`, { feedback_do_profissional: resposta })
  return res.data.data
}

export const trocarFotosFeedback = async (id, perguntas, idx1, idx2) => {
  const novas = perguntas.map((p, i) => {
    if (i === idx1) return { ...p, resposta: perguntas[idx2].resposta }
    if (i === idx2) return { ...p, resposta: perguntas[idx1].resposta }
    return p
  })
  const res = await client.put(`/api/resource/Feedback/${encodeURIComponent(id)}`, {
    perguntas_e_respostas: novas,
  })
  return res.data.data
}
