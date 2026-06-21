import axios from 'axios'
import useAuthStore from '../store/authStore'

const client = axios.create({
  baseURL: import.meta.env.VITE_FRAPPE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const profissionalToken = localStorage.getItem('frappe_token')
  const alunoToken = localStorage.getItem('aluno_token')
  if (profissionalToken) {
    config.headers['Authorization'] = `JWT ${profissionalToken}`
  } else if (alunoToken) {
    config.headers['X-Aluno-Token'] = alunoToken
  }
  return config
})

// Remove tags HTML e normaliza espaços (mensagens do Frappe vêm com markup).
function stripHtml(s) {
  if (typeof s !== 'string') return ''
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Extrai a mensagem REAL do erro do Frappe a partir do corpo da resposta.
// Frappe manda o motivo em `_server_messages` (JSON de mensagens) ou em
// `exception` ("frappe.exceptions.XError: <msg>"). Sem isso, o axios só expõe
// o genérico "Request failed with status code NNN".
export function mensagemErroFrappe(error) {
  const data = error?.response?.data
  if (!data) return ''
  // 1) _server_messages: '["{\"message\":\"...\",\"title\":\"...\"}", ...]'
  if (data._server_messages) {
    try {
      const arr = JSON.parse(data._server_messages)
      const msgs = (Array.isArray(arr) ? arr : [arr])
        .map((m) => {
          try { return JSON.parse(m).message } catch { return m }
        })
        .map(stripHtml)
        .filter(Boolean)
      const unicas = [...new Set(msgs)]
      if (unicas.length) return unicas.join('\n')
    } catch { /* ignora e tenta os próximos */ }
  }
  // 2) exception: "frappe.exceptions.ValidationError: <msg>"
  if (typeof data.exception === 'string') {
    const m = stripHtml(data.exception.replace(/^[\w.]+?(Error|Exception):\s*/, ''))
    if (m) return m
  }
  // 3) message (string) / _error_message
  if (typeof data.message === 'string' && data.message.trim()) return stripHtml(data.message)
  if (typeof data._error_message === 'string' && data._error_message.trim()) return stripHtml(data._error_message)
  return ''
}

// Flag para evitar múltiplos redirects simultâneos quando várias requests
// falham com 401 ao mesmo tempo (ex: burst de requests ao abrir o app).
let isRedirecting = false

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect && !isRedirecting) {
      isRedirecting = true
      // Usa clearAuth() para limpar Zustand + localStorage de forma consistente,
      // em vez de remover chaves manualmente (incluindo shapefy-auth).
      useAuthStore.getState().clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      } else {
        isRedirecting = false
      }
    }
    // Faz a mensagem REAL do Frappe "cuspir na tela": sobrescreve o `error.message`
    // genérico do axios pelo motivo do backend. Assim toda tela que já mostra
    // `e.message` (alert/toast/setErro) passa a exibir o porquê — sem tocar nelas.
    const msg = mensagemErroFrappe(error)
    if (msg) {
      error.frappeMessage = msg
      error.message = msg
    }
    return Promise.reject(error)
  }
)

export default client
