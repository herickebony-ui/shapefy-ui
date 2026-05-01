import client from './client'

const ENC_TPL = encodeURIComponent('Template Mensagem')
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const TEMPLATE_PADRAO = {
  name: '__default__',
  nome: 'Modelo Padrão',
  texto: `O SEU ACOMPANHAMENTO VAI ATÉ: {{FIM_PLANO}}

A ficha de treino é atualizada até a próxima segunda-feira após o envio do feedback.
Se houver atraso no feedback, o novo plano poderá atrasar.
Caso você não conclua todas as semanas, a atualização será feita em até 5 dias úteis após o último feedback.

1.0 — CRONOGRAMA DE FEEDBACKS
O feedback deve ser enviado quinzenalmente, sempre às segundas-feiras, nas seguintes datas:
{{LISTA_DATAS}}

- Responda o Feedback pelo Aplicativo ShapeFy
shapefy.online (http://shapefy.online/)

Senha de acesso do teu app: {{SENHA_ACESSO}}`,
  is_default: 1,
  profissional: '',
}

/**
 * Lista templates do profissional logado.
 * Inclui sempre o "Modelo Padrão" como primeiro item (não vem do Frappe — é hardcoded).
 */
export const listarTemplates = async () => {
  const profissional = profissionalLogado()
  const params = {
    fields: JSON.stringify(['name', 'nome', 'texto', 'is_default', 'profissional']),
    filters: JSON.stringify([
      ['profissional', '=', profissional],
    ]),
    limit: 100,
    order_by: 'creation desc',
  }
  const res = await client.get(`/api/resource/${ENC_TPL}`, { params })
  const lista = res.data.data || []
  return [TEMPLATE_PADRAO, ...lista]
}

export const buscarTemplate = async (id) => {
  if (id === TEMPLATE_PADRAO.name) return TEMPLATE_PADRAO
  const res = await client.get(`/api/resource/${ENC_TPL}/${encodeURIComponent(id)}`)
  return res.data.data
}

export const criarTemplate = async ({ nome, texto, is_default = 0 }) => {
  const res = await client.post(`/api/resource/${ENC_TPL}`, {
    nome,
    texto,
    is_default: is_default ? 1 : 0,
    profissional: profissionalLogado(),
  })
  return res.data.data
}

export const salvarTemplate = async (id, campos) => {
  const payload = { ...campos }
  if ('is_default' in payload) payload.is_default = payload.is_default ? 1 : 0
  const res = await client.put(
    `/api/resource/${ENC_TPL}/${encodeURIComponent(id)}`,
    payload
  )
  return res.data.data
}

export const excluirTemplate = async (id) => {
  if (id === TEMPLATE_PADRAO.name) {
    throw new Error('Não é possível excluir o Modelo Padrão')
  }
  await client.delete(`/api/resource/${ENC_TPL}/${encodeURIComponent(id)}`)
}

/**
 * Aplica o template substituindo variáveis.
 * Variáveis suportadas: {{NOME}}, {{FIM_PLANO}}, {{LISTA_DATAS}}, {{SENHA_ACESSO}}
 */
export const aplicarTemplate = (texto, vars = {}) => {
  let resultado = texto || ''
  resultado = resultado.replace(/\{\{NOME\}\}/g, vars.nome || '')
  resultado = resultado.replace(/\{\{FIM_PLANO\}\}/g, vars.fim_plano || '')
  resultado = resultado.replace(/\{\{LISTA_DATAS\}\}/g, vars.lista_datas || '')
  resultado = resultado.replace(/\{\{SENHA_ACESSO\}\}/g, vars.senha_acesso || '(não cadastrada)')
  return resultado
}

export { TEMPLATE_PADRAO }