import client from './client'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

export const listarFeedbacks = async ({ busca = '', status = '', dataInicio = '', dataFim = '', page = 1, limit = 500 } = {}) => {
  const profissional = profissionalLogado()
  const filtros = [['profissional', 'in', [profissional, '']]]
  if (busca) {
    filtros.push(['nome_completo', 'like', `%${busca}%`])
  } else {
    if (status) filtros.push(['status', '=', status])
    if (dataInicio) filtros.push(['date', '>=', dataInicio])
    if (dataFim) filtros.push(['date', '<=', dataFim])
  }

  const params = {
    fields: JSON.stringify(['name', 'formulario', 'titulo', 'aluno', 'nome_completo', 'profissional', 'date', 'status', 'email', 'modified', 'creation']),
    filters: JSON.stringify(filtros),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'modified desc',
  }
  const res = await client.get('/api/resource/Feedback', { params })
  const list = res.data.data || []
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
