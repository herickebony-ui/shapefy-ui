import client from './client'

export async function login(usr, pwd) {
  const response = await client.post('api/method/shapefy.api.api.login', { usr, pwd })
  return response.data
}

export async function updatePassword(key, newPassword) {
  const response = await client.post('/api/method/frappe.core.doctype.user.user.update_password', {
    key,
    new_password: newPassword,
  })
  return response.data
}

export async function logout() {
  await client.post('/api/method/shapefy.api.auth.logout')
  localStorage.removeItem('frappe_token')
  localStorage.removeItem('frappe_user')
  localStorage.removeItem('frappe_user_name')
}