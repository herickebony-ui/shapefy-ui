import client from './client'

const userEmail = () => localStorage.getItem('frappe_user') || ''

const FIELDS = [
  'name', 'tipo', 'user', 'telefone',
  'nome_completo_pf', 'cpf_pf', 'rg_pf', 'data_de_nascimento_pf',
  'nao_sou_brasileiro_pf', 'endereco_pf',
  'razao_social_pj', 'nome_fantasia_pj', 'cnpj_pj',
  'nao_e_uma_empresa_brasileira_pj', 'telefone_da_empresa', 'endereco_da_empresa_pj',
  'instagram', 'area_atuacao',
  'foto', 'banner', 'cover_image', 'professional_logo',
  'theme_color', 'theme_mode',
]

export const buscarProfissional = async () => {
  const res = await client.get('/api/resource/Profissional', {
    params: {
      fields: JSON.stringify(FIELDS),
      filters: JSON.stringify([['user', '=', userEmail()]]),
      limit: 1,
    },
  })
  return res.data?.data?.[0] || null
}

export const salvarProfissional = async (name, data) => {
  const res = await client.put(`/api/resource/Profissional/${encodeURIComponent(name)}`, data)
  return res.data?.data
}
