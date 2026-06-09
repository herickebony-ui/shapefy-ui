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
    return Promise.reject(error)
  }
)

export default client
