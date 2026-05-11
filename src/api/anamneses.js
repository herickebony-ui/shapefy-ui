import client from './client'

export const listarAnamneses = async ({ alunoId, page = 1, limit = 50 } = {}) => {
  const params = {
    fields: JSON.stringify([
      "name","titulo","status","date","enviar_aluno","aluno_preencheu","aluno",
      "nome_completo","entregue","data_entrega","formulario","creation",
    ]),
    limit,
    limit_start: (page - 1) * limit,
    order_by: 'creation desc',
  }
  if (alunoId) params.filters = JSON.stringify([["aluno","=", alunoId]])
  const res = await client.get('/api/resource/Anamnese', { params })
  return { list: res.data.data || [], hasMore: (res.data.data || []).length === limit }
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

// Considera "respondida" se pelo menos uma pergunta tem resposta preenchida.
// Aceita string, número, array (multiseleção) e objeto (anexo de arquivo).
const temAlgumaResposta = (perguntas) =>
  (perguntas || []).some(p => {
    const r = p?.resposta
    if (r === null || r === undefined) return false
    if (typeof r === 'string') return r.trim().length > 0
    if (typeof r === 'number') return true
    if (Array.isArray(r)) return r.length > 0
    if (typeof r === 'object') return Object.keys(r).length > 0
    return false
  })

export const salvarAnamnese = async (id, perguntas) => {
  // Se há respostas (independente de quem preencheu — aluno ou profissional),
  // forçar status='Respondido'. Cobre o caso em que o profissional preenche
  // manualmente, onde aluno_preencheu permanece 0 e o backend não atualiza
  // o status sozinho.
  const payload = { perguntas_e_respostas: perguntas }
  if (temAlgumaResposta(perguntas)) payload.status = 'Respondido'
  const res = await client.put(`/api/resource/Anamnese/${id}`, payload)
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
  // Quando "Enviar pro aluno" está marcado, usamos o método Python custom
  // que cria a anamnese + dispara notificação ao aluno.
  if (enviarAluno) {
    const data = new URLSearchParams({
      aluno: alunoId,
      formulario,
      enviar_aluno: 1,
    })
    const res = await client.post('/api/method/shapefy.api_shapefy.vincular_anamnese', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return res.data.message
  }
  // Sem envio: cria direto via REST. O método Python tenta setar
  // status='Pendente' nesse fluxo, mas o DocType só aceita "", 'Enviado',
  // 'Respondido', 'Finalizado' — daí o ValidationError. Aqui montamos o doc
  // com status vazio e copiamos as perguntas do template.
  const [formRes, alunoRes] = await Promise.all([
    client.get(`/api/resource/Formulario%20de%20Anamnese/${encodeURIComponent(formulario)}`),
    client.get(`/api/resource/Aluno/${encodeURIComponent(alunoId)}`),
  ])
  const template = formRes.data.data || {}
  const aluno = alunoRes.data.data || {}
  const perguntas = (template.perguntas || []).map(p => ({
    pergunta: p.pergunta,
    tipo: p.tipo,
    reqd: p.reqd || 0,
    opcoes: p.opcoes || '',
    conteudo_html: p.conteudo_html || '',
    resposta: '',
  }))
  const profissional = localStorage.getItem('frappe_user') || ''
  const today = new Date().toISOString().slice(0, 10)
  // status é mandatório no DocType — usa 'Enviado' como default mesmo sem
  // envio real (mesmo valor que o vincular_anamnese usa). Quando o profissional
  // preencher e salvar, salvarAnamnese promove pra 'Respondido'.
  const res = await client.post('/api/resource/Anamnese', {
    aluno: alunoId,
    formulario,
    titulo: template.titulo || '',
    nome_completo: aluno.nome_completo || '',
    profissional,
    date: today,
    status: 'Enviado',
    enviar_aluno: 0,
    aluno_preencheu: 0,
    entregue: 0,
    perguntas_e_respostas: perguntas,
  })
  return res.data.data
}

const nowFrappeDatetime = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const marcarEntregueAnamnese = async (id, entregue = true) => {
  const payload = entregue
    ? { entregue: 1, data_entrega: nowFrappeDatetime() }
    : { entregue: 0, data_entrega: null }
  const res = await client.put(`/api/resource/Anamnese/${encodeURIComponent(id)}`, payload)
  return res.data?.data
}