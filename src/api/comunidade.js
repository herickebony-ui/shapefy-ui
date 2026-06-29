import client from './client'

const BASE = '/api/method/shapefy.api.comunidade'

// ── Profissional ────────────────────────────────────────────────────────────

export const listarComunidades = async () => {
  const res = await client.get(`${BASE}.get_my_communities`)
  return res.data?.message || []
}

export const criarComunidade = async ({ titulo, descricao, imagem }) => {
  const res = await client.post(`${BASE}.create_community`, { titulo, descricao, imagem })
  return res.data?.message
}

export const atualizarComunidade = async (name, campos) => {
  const res = await client.post(`${BASE}.update_community`, { name, ...campos })
  return res.data?.message
}

export const arquivarComunidade = async (name) => {
  const res = await client.post(`${BASE}.archive_community`, { name })
  return res.data?.message
}

export const listarMembros = async (community, page = 1, limit = 20) => {
  const res = await client.get(`${BASE}.get_community_members`, {
    params: { community, page, limit },
  })
  return res.data?.message || { list: [], total: 0 }
}

export const removerMembro = async (community, membro) => {
  const res = await client.post(`${BASE}.remove_student_from_community`, { community, membro })
  return res.data?.message
}

export const feedComunidade = async (community, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.get_community_feed`, {
    params: { community, cursor, limit },
  })
  return res.data?.message || { posts: [], has_more: false }
}

export const criarPost = async (community, { caption, imagens }) => {
  const res = await client.post(`${BASE}.create_community_post`, {
    community, caption, imagens: JSON.stringify(imagens || []),
  })
  return res.data?.message
}

export const criarComentario = async (post, text, parent_comentario) => {
  const res = await client.post(`${BASE}.create_community_comment`, { post, text, parent_comentario: parent_comentario || undefined })
  return res.data?.message
}

export const listarRespostas = async (comment, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.get_comment_replies`, {
    params: { comment, cursor, limit },
  })
  return res.data?.message || { replies: [], has_more: false }
}

export const toggleReacao = async (post) => {
  const res = await client.post(`${BASE}.toggle_community_reaction`, { post })
  return res.data?.message
}

export const ocultarPost = async (post) => {
  const res = await client.post(`${BASE}.hide_community_post`, { post })
  return res.data?.message
}

export const ocultarComentario = async (comment) => {
  const res = await client.post(`${BASE}.hide_community_comment`, { comment })
  return res.data?.message
}

export const listarComentarios = async (post, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.get_post_comments`, {
    params: { post, cursor, limit },
  })
  return res.data?.message || { comments: [], has_more: false }
}

export const fixarPost = async (post) => {
  const res = await client.post(`${BASE}.pin_post`, { post })
  return res.data?.message
}

export const desfixarPost = async (post) => {
  const res = await client.post(`${BASE}.unpin_post`, { post })
  return res.data?.message
}

export const criarEnquete = async (community, pergunta, opcoes, data_encerramento) => {
  const res = await client.post(`${BASE}.create_poll`, {
    community, pergunta, opcoes: JSON.stringify(opcoes), data_encerramento,
  })
  return res.data?.message
}

export const encerrarEnquete = async (enquete) => {
  const res = await client.post(`${BASE}.close_poll`, { enquete })
  return res.data?.message
}

export const votarEnquete = async (enquete, opcao) => {
  const res = await client.post(`${BASE}.vote_poll`, { enquete, opcao })
  return res.data?.message
}

export const obterEnqueteAtiva = async (community) => {
  const res = await client.get(`${BASE}.get_active_poll`, { params: { community } })
  return res.data?.message
}

export const editarPost = async (post, caption) => {
  const res = await client.post(`${BASE}.edit_post`, { post, caption })
  return res.data?.message
}

export const excluirPost = async (post) => {
  const res = await client.post(`${BASE}.delete_post`, { post })
  return res.data?.message
}

export const editarComentario = async (comment, text) => {
  const res = await client.post(`${BASE}.edit_comment`, { comment, text })
  return res.data?.message
}

export const excluirComentario = async (comment) => {
  const res = await client.post(`${BASE}.delete_comment`, { comment })
  return res.data?.message
}

export const obterPost = async (post) => {
  const res = await client.get(`${BASE}.get_single_post`, { params: { post } })
  return res.data?.message
}

// ── Aluno ───────────────────────────────────────────────────────────────────

export const alunoComunidades = async () => {
  const res = await client.get(`${BASE}.aluno_get_my_communities`)
  return res.data?.message || []
}

export const alunoVotarEnquete = async (enquete, opcao) => {
  const res = await client.post(`${BASE}.aluno_vote_poll`, { enquete, opcao })
  return res.data?.message
}

export const alunoEnqueteAtiva = async (community) => {
  const res = await client.get(`${BASE}.aluno_get_active_poll`, { params: { community } })
  return res.data?.message
}

export const alunoFeed = async (community, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.aluno_get_community_feed`, {
    params: { community, cursor, limit },
  })
  return res.data?.message || { posts: [], has_more: false }
}

export const alunoCriarPost = async (community, { caption, imagens }) => {
  const res = await client.post(`${BASE}.aluno_create_post`, {
    community, caption, imagens: JSON.stringify(imagens || []),
  })
  return res.data?.message
}

export const alunoCriarComentario = async (post, text, parent_comentario) => {
  const res = await client.post(`${BASE}.aluno_create_comment`, { post, text, parent_comentario: parent_comentario || undefined })
  return res.data?.message
}

export const alunoListarRespostas = async (comment, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.aluno_get_comment_replies`, {
    params: { comment, cursor, limit },
  })
  return res.data?.message || { replies: [], has_more: false }
}

export const alunoToggleReacao = async (post) => {
  const res = await client.post(`${BASE}.aluno_toggle_reaction`, { post })
  return res.data?.message
}

export const alunoComentarios = async (post, { cursor, limit } = {}) => {
  const res = await client.get(`${BASE}.aluno_get_post_comments`, {
    params: { post, cursor, limit },
  })
  return res.data?.message || { comments: [], has_more: false }
}

export const alunoEditarPost = async (post, caption) => {
  const res = await client.post(`${BASE}.aluno_edit_post`, { post, caption })
  return res.data?.message
}

export const alunoExcluirPost = async (post) => {
  const res = await client.post(`${BASE}.aluno_delete_post`, { post })
  return res.data?.message
}

export const alunoEditarComentario = async (comment, text) => {
  const res = await client.post(`${BASE}.aluno_edit_comment`, { comment, text })
  return res.data?.message
}

export const alunoExcluirComentario = async (comment) => {
  const res = await client.post(`${BASE}.aluno_delete_comment`, { comment })
  return res.data?.message
}

export const alunoObterPost = async (post) => {
  const res = await client.get(`${BASE}.aluno_get_single_post`, { params: { post } })
  return res.data?.message
}

// ── Upload ──────────────────────────────────────────────────────────────────

export const uploadImagemComunidade = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('is_private', '0')
  const res = await client.post('/api/method/upload_file', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.message?.file_url
}
