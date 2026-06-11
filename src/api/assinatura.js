import client from './client'

const userEmail = () => localStorage.getItem('frappe_user') || ''

export const listarPlanosParaMigracao = async () => {
  const res = await client.get('/api/method/shapefy.api.assinatura.listar_planos_para_migracao')
  return res.data?.message || { plans: [], plano_atual: null }
}

export const iniciarMigracaoPlano = async (novo_plano) => {
  const res = await client.post('/api/method/shapefy.api.assinatura.iniciar_migracao_plano', { novo_plano })
  return res.data?.message
}

export const buscarAssinatura = async () => {
  const res = await client.get('/api/resource/Assinatura%20do%20Usuario', {
    params: {
      fields: JSON.stringify(['name', 'usuario', 'plano_de_assinatura', 'valido_de', 'valido_ate', 'status']),
      filters: JSON.stringify([['usuario', '=', userEmail()], ['status', '=', 'Ativo']]),
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
      fields: JSON.stringify(['name', 'creation', 'status', 'montante', 'data_da_transacao', 'id_da_transacao', 'pago']),
      filters: JSON.stringify([['usuario', '=', userEmail()]]),
      limit: 50,
      order_by: 'creation desc',
    },
  })
  return res.data?.data || []
}
