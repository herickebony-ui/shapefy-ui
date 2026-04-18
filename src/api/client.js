import axios from 'axios'

const client = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('frappe_token')
  if (token) {
    config.headers['Authorization'] = `token ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('frappe_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client