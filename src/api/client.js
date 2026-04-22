import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_FRAPPE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('frappe_token')
  if (token) {
    config.headers['Authorization'] = `JWT ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('frappe_token')
    }
    return Promise.reject(error)
  }
)

export default client