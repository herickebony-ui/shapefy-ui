// API pública (sem auth) para o link de cadastro do aluno.
// Usa fetch direto em vez do client axios pra não disparar interceptor de 401 nem injetar token.

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const buildUrl = (method, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return `${FRAPPE_URL}/api/method/${method}${qs}`
}

export const getProfissionalPorSlug = async (slug) => {
  const res = await fetch(buildUrl('shapefy.api.cadastro_publico.get_profissional_por_slug', { slug }), {
    method: 'GET',
    headers: { 'X-Frappe-CSRF-Token': 'token' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Erro ao buscar link')
  const data = await res.json()
  return data.message || null
}

export const enviarCadastroPublico = async (slug, dados) => {
  const res = await fetch(buildUrl('shapefy.api.cadastro_publico.criar_aluno_via_link'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': 'token',
    },
    body: JSON.stringify({ slug, ...dados }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const erro = data?.message?.erro || data?._server_messages || 'erro_desconhecido'
    const err = new Error(erro)
    err.emailMasked = data?.message?.email_masked || null
    throw err
  }
  return data.message
}

export const verificarAlunoExistente = async (slug, { email, cpf } = {}) => {
  const params = { slug }
  if (email) params.email = email
  if (cpf) params.cpf = cpf
  const res = await fetch(buildUrl('shapefy.api.cadastro_publico.verificar_aluno_existente', params), {
    method: 'GET',
    headers: { 'X-Frappe-CSRF-Token': 'token' },
  })
  if (!res.ok) throw new Error('verificar_aluno_existente_falhou')
  const data = await res.json()
  return data.message || { existe: false }
}

export const recuperarAcessoAluno = async (slug, email) => {
  const res = await fetch(buildUrl('shapefy.api.cadastro_publico.recuperar_acesso_aluno'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': 'token',
    },
    body: JSON.stringify({ slug, email }),
  })
  if (!res.ok) throw new Error('recuperar_acesso_aluno_falhou')
  const data = await res.json().catch(() => ({}))
  return data.message || { ok: true }
}

export const buscarCep = async (cep) => {
  const digits = String(cep || '').replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    }
  } catch {
    return null
  }
}
