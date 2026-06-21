import client from './client'

const RESOURCE = 'Tipo de Serie'

export const listarTiposDeSerie = async ({ apenasAtivos = true } = {}) => {
  const filtros = [[RESOURCE, 'profissional', '!=', '']]
  if (apenasAtivos) filtros.push([RESOURCE, 'enabled', '=', 1])
  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE)}`, {
    params: {
      fields: JSON.stringify(['name', 'nome', 'contabilizar_volume', 'enabled']),
      filters: JSON.stringify(filtros),
      limit: 500,
      order_by: 'nome asc',
    },
  })
  return res.data?.data || []
}

export const salvarTipoDeSerie = async (name, payload) => {
  if (name) {
    const res = await client.put(
      `/api/resource/${encodeURIComponent(RESOURCE)}/${encodeURIComponent(name)}`,
      payload,
    )
    return res.data?.data
  }
  const res = await client.post(`/api/resource/${encodeURIComponent(RESOURCE)}`, payload)
  return res.data?.data
}

export const excluirTipoDeSerie = async (name) => {
  await client.delete(
    `/api/resource/${encodeURIComponent(RESOURCE)}/${encodeURIComponent(name)}`,
  )
}
