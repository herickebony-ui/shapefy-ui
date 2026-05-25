import axios from 'axios'

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

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('frappe_token')
      localStorage.removeItem('frappe_user')
      localStorage.removeItem('frappe_user_name')
      localStorage.removeItem('aluno_token')
      localStorage.removeItem('shapefy-auth')
      localStorage.removeItem('shapefy-onboarding')
      localStorage.removeItem('shapefy-jornada-dismissed')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
