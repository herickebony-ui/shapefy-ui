import client from './client'

export const getMeuLinkCadastro = async () => {
  const res = await client.get('/api/method/shapefy.api.cadastro_publico.get_meu_link_cadastro')
  return res.data.message || { slug: '', ativo: 1, sugestao_slug: '' }
}

export const salvarMeuLinkCadastro = async ({ slug, ativo }) => {
  const res = await client.post('/api/method/shapefy.api.cadastro_publico.salvar_meu_link_cadastro', {
    slug,
    ativo: ativo ? 1 : 0,
  })
  return res.data.message
}
