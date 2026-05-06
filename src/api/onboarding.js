import client from './client'

const owner = () => localStorage.getItem('frappe_user') || ''

// Conta os itens do usuário em um DocType, usando limit=0 para retornar só count.
// Frappe: limit_page_length=0 retorna total sem paginar.
const contar = async (doctype, extraFilters = []) => {
  const filters = [['owner', '=', owner()], ...extraFilters]
  try {
    const res = await client.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: {
        fields: JSON.stringify(['name']),
        filters: JSON.stringify(filters),
        limit_page_length: 0,
      },
    })
    return (res.data?.data || []).length
  } catch (e) {
    console.error(`Erro ao contar ${doctype}:`, e)
    return 0
  }
}

export const buscarContagensOnboarding = async () => {
  const [alimentos, exercicios, alongamentos, aerobicos] = await Promise.all([
    contar('Alimento'),
    contar('Treino Exercicio'),
    contar('Alongamento'),
    contar('Exercicio Aerobico'),
  ])
  return { alimentos, exercicios, alongamentos, aerobicos }
}

// Conta total de itens de um doctype filtrando por owner. Alguns doctypes
// usam "profissional" em vez de "owner" pra ownership; aceitar override.
const contarComOwnerField = async (doctype, ownerField) => {
  const filters = [[ownerField, '=', owner()]]
  try {
    const res = await client.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: {
        fields: JSON.stringify(['name']),
        filters: JSON.stringify(filters),
        limit_page_length: 0,
      },
    })
    return (res.data?.data || []).length
  } catch (e) {
    console.error(`Erro ao contar ${doctype}:`, e)
    return 0
  }
}

// Conta sem filtro próprio — o Frappe escopa via permission system. Usar pra
// doctypes onde a listagem da própria tela também não filtra explicitamente
// (ex: Formulario de Anamnese, Formulario Feedback, Dieta, Ficha — onde
// confiar no filtro 'owner' pode dar mismatch quando o doctype usa outra
// regra de ownership).
const contarPermissao = async (doctype) => {
  try {
    const res = await client.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: {
        fields: JSON.stringify(['name']),
        limit_page_length: 0,
      },
    })
    return (res.data?.data || []).length
  } catch (e) {
    console.error(`Erro ao contar ${doctype}:`, e)
    return 0
  }
}

// Counts da jornada inicial (passo a passo do profissional).
// Retorna apenas o que o backend expõe via API nativa do Frappe; quando algum
// dado não puder ser lido, retorna 0 e o passo aparece como pendente.
export const buscarContagensJornada = async () => {
  const [alunos, formAnamnese, formFeedback, dietas, fichas] = await Promise.all([
    contarComOwnerField('Aluno', 'profissional'),
    contarPermissao('Formulario de Anamnese'),
    contarPermissao('Formulario Feedback'),
    contarPermissao('Dieta'),
    contarPermissao('Ficha'),
  ])
  return { alunos, formAnamnese, formFeedback, dietas, fichas }
}
