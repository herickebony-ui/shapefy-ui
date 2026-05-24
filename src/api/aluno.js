import client from './client'

// Login do aluno via código de acesso. Retorna o doc Aluno + senha_de_acesso.
// O senha_de_acesso vira o token enviado em X-Aluno-Token nas requests seguintes.
export const autenticarAluno = async (senha) => {
  const res = await client.post('/api/method/shapefy.www.login_aluno.autenticar_aluno', { senha })
  return res.data?.message || null
}

// Encerra a sessão do aluno no backend (limpa cookie em shapefy.online).
// Sem isso o cookie cross-domain fica vivo 30 dias mesmo depois do logout local.
export const logoutAluno = async () => {
  try {
    await client.post('/api/method/shapefy.www.login_aluno.logout_aluno')
  } catch (err) {
    console.warn('Falha ao deslogar aluno no backend:', err)
  }
}

// Dados consolidados pra home do aluno: aluno, profissional (banner+IG+área),
// cards (5 módulos com url_legado), pendencias (anamnese/feedback/feedback_agendado/avaliações),
// notificacoes (10 últimas) e nao_visualizadas (badge). Cache Redis 60s no backend.
export const homeAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.home')
  return res.data?.message || null
}

// Próximos feedbacks agendados (até 5). Endpoint separado pra esse card.
export const listarProximosFeedbacksAluno = async () => {
  try {
    const res = await client.get('/api/method/shapefy.api.aluno.proximos_feedbacks')
    return res.data?.message || []
  } catch (err) {
    if (err.response?.status === 404) return []
    throw err
  }
}

// Marca todas as notificações do aluno como visualizadas. Invalida cache do home.
export const marcarNotificacoesVisualizadasAluno = async () => {
  const res = await client.post('/api/method/shapefy.api.aluno.marcar_notificacoes_visualizadas')
  return res.data?.message || { marcadas: 0 }
}

// Busca um feedback específico do aluno (validação de posse no backend).
export const buscarFeedbackAluno = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.feedback', { params: { name } })
  return res.data?.message || null
}

// Envia as respostas do feedback. Payload conforme contrato:
//   perguntas_e_respostas: child table com {pergunta, tipo, opcoes, reqd, conteudo_html, resposta}
//   status: "Respondido"
//   verificar: 1  → trigger pra rotina que converte imagens privadas em públicas
// Front NÃO seta: data_resposta, feedback_do_profissional, aluno_preencheu.
export const responderFeedback = async (name, perguntas) => {
  const res = await client.post('/api/method/shapefy.api.aluno.responder_feedback', {
    name,
    perguntas_e_respostas: perguntas,
    status: 'Respondido',
    verificar: 1,
  })
  return res.data?.message || null
}

// Lista todas as prescrições publicadas do aluno (ordenadas da mais recente).
// Backend retorna { prescricoes: [...] } com profissional+itens já populados.
export const listarPrescricoesAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.prescricoes')
  return res.data?.message?.prescricoes || []
}

// Busca uma anamnese específica do aluno (validação de posse no backend).
export const buscarAnamneseAluno = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.anamnese', { params: { name } })
  return res.data?.message || null
}

// Envia as respostas da anamnese. Backend cuida de status='Respondido',
// aluno_preencheu=1, data_resposta (before_save) e verificar=1 (cron
// process_anamnese_images_to_public converte imagens privadas em públicas).
// Front só envia name + child table.
export const responderAnamnese = async (name, perguntas) => {
  const res = await client.post('/api/method/shapefy.api.aluno.responder_anamnese', {
    name,
    perguntas_e_respostas: perguntas,
  })
  return res.data?.message || null
}

// Upload de foto pelo aluno. Wrapper backend DEVE chamar upload_file com
// is_private=0 (pública, pra render via <img src>) e optimize=0 (preserva
// qualidade original — comparações visuais entre feedbacks exigem isso).
export const uploadFotoAluno = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await client.post('/api/method/shapefy.api.aluno.upload_foto', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.message?.file_url || res.data?.file_url || null
}
