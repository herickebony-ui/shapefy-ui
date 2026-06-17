import client from './client'

export const listarFuncionarios = async () => {
  const res = await client.get('/api/method/shapefy.api.funcionario.listar_funcionarios')
  return res.data?.message || []
}

export const criarFuncionario = async ({ email, nome, permissoes }) => {
  const res = await client.get('/api/method/shapefy.api.funcionario.criar_funcionario', {
    params: {
      email,
      nome,
      permissoes: JSON.stringify(permissoes || {}),
    },
  })
  return res.data?.message
}

export const atualizarPermissoes = async (funcionario_name, permissoes) => {
  const res = await client.get('/api/method/shapefy.api.funcionario.atualizar_permissoes', {
    params: {
      funcionario_name,
      permissoes: JSON.stringify(permissoes),
    },
  })
  return res.data?.message
}

export const desativarFuncionario = async (funcionario_name) => {
  await client.get('/api/method/shapefy.api.funcionario.desativar_funcionario', {
    params: { funcionario_name },
  })
}

export const reativarFuncionario = async (funcionario_name) => {
  await client.get('/api/method/shapefy.api.funcionario.reativar_funcionario', {
    params: { funcionario_name },
  })
}

export const enviarResetSenha = async (funcionario_name) => {
  await client.get('/api/method/shapefy.api.funcionario.enviar_reset_senha', {
    params: { funcionario_name },
  })
}

export const minhasPermissoes = async () => {
  const res = await client.get('/api/method/shapefy.api.funcionario.minhas_permissoes')
  return res.data?.message || null
}
