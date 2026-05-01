import client from './client'

const ENC_FERIAS = encodeURIComponent('Periodo Ferias')
const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

/**
 * Lista todos os períodos de férias do profissional logado.
 * Ordenado por data de início descendente.
 */
export const listarFerias = async () => {
  const profissional = profissionalLogado()
  const params = {
    fields: JSON.stringify([
      'name',
      'data_inicio',
      'data_fim',
      'descricao',
      'profissional',
    ]),
    filters: JSON.stringify([
      ['profissional', '=', profissional],
    ]),
    limit: 100,
    order_by: 'data_inicio desc',
  }
  const res = await client.get(`/api/resource/${ENC_FERIAS}`, { params })
  return res.data.data || []
}

export const criarFerias = async ({ data_inicio, data_fim, descricao = '' }) => {
  const res = await client.post(`/api/resource/${ENC_FERIAS}`, {
    data_inicio,
    data_fim,
    descricao,
    profissional: profissionalLogado(),
  })
  return res.data.data
}

export const salvarFerias = async (id, campos) => {
  const res = await client.put(
    `/api/resource/${ENC_FERIAS}/${encodeURIComponent(id)}`,
    campos
  )
  return res.data.data
}

export const excluirFerias = async (id) => {
  await client.delete(`/api/resource/${ENC_FERIAS}/${encodeURIComponent(id)}`)
}

/**
 * Helper local — checa se uma data está dentro de algum período de férias.
 * Não chama API. Recebe a lista já carregada e a data como string ISO.
 */
export const dataEhFerias = (dateISO, listaFerias = []) => {
  if (!dateISO || !listaFerias.length) return false
  const dt = new Date(dateISO + 'T12:00:00')
  return listaFerias.some(f => {
    if (!f.data_inicio || !f.data_fim) return false
    const inicio = new Date(f.data_inicio + 'T00:00:00')
    const fim = new Date(f.data_fim + 'T23:59:59')
    return dt >= inicio && dt <= fim
  })
}