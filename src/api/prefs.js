import client from './client'

// Armazena preferências por usuário na tabela DefaultValue do Frappe.
// Não requer mudança de schema — usa o mecanismo nativo de defaults do Frappe.

export const getPref = async (key) => {
  const res = await client.get('/api/method/frappe.client.get_default', { params: { key } })
  return res.data.message || null
}

export const setPref = async (key, value) => {
  await client.post('/api/method/frappe.client.set_default', { key, value: value ?? '' })
}
