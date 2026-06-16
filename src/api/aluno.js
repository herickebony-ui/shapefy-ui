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
export const responderFeedback = async (name, perguntas, extra = {}) => {
  const res = await client.post('/api/method/shapefy.api.aluno.responder_feedback', {
    name,
    perguntas_e_respostas: perguntas,
    status: 'Respondido',
    verificar: 1,
    ...(extra.fotos != null ? { fotos: extra.fotos } : {}),
    ...(extra.peso != null ? { peso: extra.peso } : {}),
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
export const responderAnamnese = async (name, perguntas, extra = {}) => {
  const res = await client.post('/api/method/shapefy.api.aluno.responder_anamnese', {
    name,
    perguntas_e_respostas: perguntas,
    ...(extra.fotos != null ? { fotos: extra.fotos } : {}),
    ...(extra.peso != null ? { peso: extra.peso } : {}),
  })
  return res.data?.message || null
}

// Lista as dietas do aluno (ativas / atribuidas pelo profissional).
// Backend retorna { dietas: [{name, nome_completo, date, final_date, strategy,
// week_days, dias_info}] }. Se aluno nao tem modulo dieta, retorna [].
export const listarDietasAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.dieta_lista')
  return res.data?.message?.dietas || []
}

// Lista (leve) das instruções vinculadas ao aluno: [{name, titulo, descricao, tipo}].
export const buscarInstrucoesAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.instrucoes')
  return res.data?.message?.instrucoes || []
}

// Detalhe de uma instrução (com os blocos). Só se o aluno estiver vinculado.
export const buscarInstrucaoDetalheAluno = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.instrucao_detalhe', { params: { name } })
  return res.data?.message || null
}

// Busca uma dieta especifica (com refeicoes/opcoes/grupos/substitutos ja
// populados). Backend retorna { dieta: {...campos do header...},
// meals: [{index, title, options: [{index, title, legend, groups: [{main,
// subs}]}]}] }. Lanca PermissionError se aluno tentar acessar dieta de outro.
export const buscarDietaAluno = async (name) => {
  const res = await client.get('/api/method/shapefy.api.aluno.dieta_detalhe', { params: { name } })
  return res.data?.message || null
}

// Perfil do aluno (read-only). Retorna { aluno: {...} } com campos filtrados:
// dados de exibicao + treino/dieta (0/1 -> "acesso liberado") + foto_url
// (absoluta) + profissional_nome (legivel). Esconde fields internos.
// skipAuthRedirect: se 401, mostra modal em vez de deslogar — o erro pode ser
// do endpoint nao estar deployado, nao da sessao do aluno.
export const perfilAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.perfil', { skipAuthRedirect: true })
  return res.data?.message?.aluno || null
}

// Metadados + valores pra montar o form de edicao. Retorna { aluno, meta }.
// meta[]: {fieldname, fieldtype, label, options, reqd, read_only, description}.
// Backend pula breaks/tipos nao-input e sobrescreve 'objetivo' (Link -> Select
// com opcoes dinamicas de Objetivo Ficha).
export const perfilEditarAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.perfil_editar', { skipAuthRedirect: true })
  return res.data?.message || { aluno: {}, meta: [] }
}

// Salva alteracoes do perfil. Payload: data=[{fieldname, value}, ...].
// Backend ignora AVOID_FIELDS silenciosamente e lanca erro se fieldname nao existe.
export const salvarPerfilAluno = async (data) => {
  const res = await client.post('/api/method/shapefy.api.aluno.perfil_salvar', { data }, { skipAuthRedirect: true })
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
