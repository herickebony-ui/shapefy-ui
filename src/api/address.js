import client from './client'

export const buscarAddress = async (name) => {
  const res = await client.get(`/api/resource/Address/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const criarAddress = async (data) => {
  const res = await client.post('/api/resource/Address', data)
  return res.data?.data
}

export const salvarAddress = async (name, data) => {
  const res = await client.put(`/api/resource/Address/${encodeURIComponent(name)}`, data)
  return res.data?.data
}
