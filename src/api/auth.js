import client from './client'

export async function login(usr, pwd) {
  const response = await client.post('api/method/shapefy.api.api.login', { usr, pwd })
  return response.data
}

export async function resetPassword(email) {
  const params = new URLSearchParams()
  params.append('cmd', 'frappe.core.doctype.user.user.reset_password')
  params.append('user', email)
  const response = await client.post('/', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
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