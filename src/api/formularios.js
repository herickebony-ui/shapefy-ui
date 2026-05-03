import client from './client'
import { tipoParaFrappe, tipoCanonical } from '../utils/formularioUtils'

const ENC_ANAMNESE = 'Formulario%20de%20Anamnese'
const ENC_FEEDBACK = 'Formulario%20Feedback'
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const serializarPerguntas = (perguntas, doctype) =>
  perguntas.map(({ _id, ...p }) => ({
    pergunta: p.pergunta,
    reqd: p.reqd ? 1 : 0,
    tipo: tipoParaFrappe(p.tipo, doctype),
    opcoes: p.opcoes || '',
    conteudo_html: p.conteudo_html || '',
  }))

const deserializarPerguntas = (perguntas = []) =>
  perguntas.map(p => ({
    ...p,
    _id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: tipoCanonical(p.tipo),
  }))

// ─── Formulario de Anamnese ───────────────────────────────────────────────────

export const listarFormulariosAnamnese = async () => {
  const res = await client.get(`/api/resource/${ENC_ANAMNESE}`, {
    params: {
      fields: JSON.stringify(['name', 'titulo']),
      limit: 100,
      order_by: 'creation desc',
    },
  })
  return res.data.data || []
}

export const buscarFormularioAnamnese = async (id) => {
  const res = await client.get(`/api/resource/${ENC_ANAMNESE}/${encodeURIComponent(id)}`)
  const d = res.data.data
  return { ...d, perguntas: deserializarPerguntas(d.perguntas) }
}

export const criarFormularioAnamnese = async ({ titulo, perguntas }) => {
  const res = await client.post(`/api/resource/${ENC_ANAMNESE}`, {
    titulo,
    profissional: profissionalLogado(),
    perguntas: serializarPerguntas(perguntas, 'anamnese'),
  })
  return res.data.data
}

export const salvarFormularioAnamnese = async (id, { titulo, perguntas }) => {
  const res = await client.put(`/api/resource/${ENC_ANAMNESE}/${encodeURIComponent(id)}`, {
    titulo,
    perguntas: serializarPerguntas(perguntas, 'anamnese'),
  })
  return res.data.data
}

export const excluirFormularioAnamnese = async (id) => {
  await client.delete(`/api/resource/${ENC_ANAMNESE}/${encodeURIComponent(id)}`)
}

// ─── Formulario Feedback ──────────────────────────────────────────────────────

export const listarFormulariosFeedback = async () => {
  const res = await client.get(`/api/resource/${ENC_FEEDBACK}`, {
    params: {
      fields: JSON.stringify([
        'name', 'titulo', 'enabled',
        'dieta', 'treino', 'feedback_inicial',
      ]),
      limit: 100,
      order_by: 'creation desc',
    },
  })
  return res.data.data || []
}

export const buscarFormularioFeedback = async (id) => {
  const res = await client.get(`/api/resource/${ENC_FEEDBACK}/${encodeURIComponent(id)}`)
  const d = res.data.data
  return { ...d, perguntas: deserializarPerguntas(d.perguntas) }
}

export const criarFormularioFeedback = async (payload) => {
  const { titulo, enabled, feedback_inicial, dieta, treino, perguntas } = payload
  const res = await client.post(`/api/resource/${ENC_FEEDBACK}`, {
    titulo, profissional: profissionalLogado(),
    enabled: enabled ? 1 : 0,
    feedback_inicial: feedback_inicial ? 1 : 0,
    dieta: dieta ? 1 : 0,
    treino: treino ? 1 : 0,
    perguntas: serializarPerguntas(perguntas, 'feedback'),
  })
  return res.data.data
}

export const salvarFormularioFeedback = async (id, payload) => {
  const { titulo, enabled, feedback_inicial, dieta, treino, perguntas } = payload
  const res = await client.put(`/api/resource/${ENC_FEEDBACK}/${encodeURIComponent(id)}`, {
    titulo,
    enabled: enabled ? 1 : 0,
    feedback_inicial: feedback_inicial ? 1 : 0,
    dieta: dieta ? 1 : 0,
    treino: treino ? 1 : 0,
    perguntas: serializarPerguntas(perguntas, 'feedback'),
  })
  return res.data.data
}

export const excluirFormularioFeedback = async (id) => {
  await client.delete(`/api/resource/${ENC_FEEDBACK}/${encodeURIComponent(id)}`)
}
