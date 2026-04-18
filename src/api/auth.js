import client from './client'

export async function login(usr, pwd) {
  const response = await client.post('/api/method/shapefy.api.login_and_get_token', { usr, pwd })
  return response.data
}

export async function logout() {
  await client.post('/api/method/logout')
}