import client from './client'

const userEmail = () => localStorage.getItem('frappe_user') || ''

export const buscarAssinatura = async () => {
  const res = await client.get('/api/resource/Assinatura%20do%20Usuario', {
    params: {
      fields: JSON.stringify(['name', 'usuario', 'plano_de_assinatura', 'valido_de', 'valido_ate', 'status']),
      filters: JSON.stringify([['usuario', '=', userEmail()]]),
      limit: 1,
    },
  })
  return res.data?.data?.[0] || null
}

export const buscarPlano = async (name) => {
  const res = await client.get(`/api/resource/Plano%20de%20Assinatura/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const listarFaturas = async (assinatura) => {
  const res = await client.get('/api/resource/Fatura%20de%20Assinatura', {
    params: {
      fields: JSON.stringify(['name', 'creation', 'status', 'montante', 'data_da_transacao']),
      filters: JSON.stringify([['usuario', '=', userEmail()]]),
      limit: 50,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
