import client from './client'

// Login do aluno via código de acesso. Retorna o doc Aluno + senha_de_acesso.
// O senha_de_acesso vira o token enviado em X-Aluno-Token nas requests seguintes.
export const autenticarAluno = async (senha) => {
  const res = await client.post('/api/method/shapefy.www.login_aluno.autenticar_aluno', { senha })
  return res.data?.message || null
}

// Endpoint backend (a ser criado): retorna dados completos do aluno logado.
// O backend identifica pelo header X-Aluno-Token.
export const meAluno = async () => {
  const res = await client.get('/api/method/shapefy.api.aluno.me')
  return res.data?.message || null
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

// Upload de foto pelo aluno. Wrapper backend chama upload_file internamente
// com is_private=0 (foto fica acessível por <img src>).
export const uploadFotoAluno = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await client.post('/api/method/shapefy.api.aluno.upload_foto', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.message?.file_url || res.data?.file_url || null
}
