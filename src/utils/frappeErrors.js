// Extrai a mensagem amigável de um erro retornado pelo Frappe.
//
// Frappe coloca a mensagem real em duas camadas:
//   error.response.data._server_messages = '["{\"message\":\"...\",\"title\":\"...\"}"]'
// E também em error.response.data.exception para tracebacks.
// Esse helper retorna a primeira mensagem útil sem HTML.
export function parseFrappeError(error) {
  const data = error?.response?.data
  if (!data) return null

  if (data._server_messages) {
    try {
      const arr = JSON.parse(data._server_messages)
      for (const item of arr) {
        const obj = typeof item === 'string' ? JSON.parse(item) : item
        if (obj?.message) return obj.message.replace(/<[^>]*>/g, '').trim()
      }
    } catch {}
  }

  if (typeof data.exception === 'string') {
    const match = data.exception.match(/(?:ValidationError|MandatoryError|.*Error):\s*(.+)$/m)
    if (match) return match[1].trim()
    return data.exception
  }

  return null
}
