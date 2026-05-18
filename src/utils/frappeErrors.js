// Extrai mensagens úteis de um erro retornado pelo Frappe.
//
// Duas APIs públicas:
//   parseFrappeError(err)       → string | null   (compat: primeira mensagem)
//   parseFrappeErrorDetail(err) → { type, title, messages[], statusCode, raw }
//                                  (lista completa + categoria, para ErrorModal)
//
// Frappe pode devolver erros em vários campos simultâneos:
//   error.response.data._server_messages = '["{\"message\":\"...\",\"indicator\":\"red\"}", ...]'
//   error.response.data.exception        = 'frappe.exceptions.MandatoryError: [Dieta, NEW-XX]: aluno, date'
//   error.response.data.exc_type         = 'MandatoryError' | 'ValidationError' | 'LinkValidationError' | ...
//   error.response.data._error_message   = 'mensagem solta'
//   error.response.data.messages         = ['msg1', 'msg2']

const TYPE_TITLES = {
  mandatory:   'Campos obrigatórios não preenchidos',
  validation:  'Não foi possível salvar',
  link:        'Referência inválida',
  duplicate:   'Registro duplicado',
  permission:  'Sem permissão',
  timestamp:   'Documento desatualizado',
  network:     'Falha de conexão',
  server:      'Erro inesperado no servidor',
  unknown:     'Não foi possível concluir a ação',
}

const EXC_TYPE_TO_KIND = {
  MandatoryError:         'mandatory',
  ValidationError:        'validation',
  LinkValidationError:    'link',
  LinkExistsError:        'link',
  DuplicateEntryError:    'duplicate',
  UniqueValidationError:  'duplicate',
  PermissionError:        'permission',
  TimestampMismatchError: 'timestamp',
}

const stripHtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// _server_messages é uma string JSON contendo um array de strings JSON.
// Cada item interno tem { message, title?, indicator? }. Pode ter várias.
function parseServerMessages(raw) {
  if (!raw) return []
  try {
    const outer = typeof raw === 'string' ? JSON.parse(raw) : raw
    const arr = Array.isArray(outer) ? outer : [outer]
    const out = []
    for (const item of arr) {
      try {
        const obj = typeof item === 'string' ? JSON.parse(item) : item
        const msg = stripHtml(obj?.message ?? obj?.title ?? item)
        if (msg) out.push(msg)
      } catch {
        const msg = stripHtml(item)
        if (msg) out.push(msg)
      }
    }
    return out
  } catch {
    return []
  }
}

// MandatoryError vem como "...[DocType, name]: campo1, campo2, campo3"
function extractMandatoryFields(exception) {
  if (!exception) return []
  const m = String(exception).match(/MandatoryError:\s*\[[^\]]*\]:\s*(.+)$/m)
                || String(exception).match(/MandatoryError:\s*(.+)$/m)
  if (!m) return []
  return m[1].split(',').map(f => f.trim()).filter(Boolean)
}

function extractExceptionLine(exception) {
  if (!exception) return null
  const lines = String(exception).split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines.reverse()) {
    const m = line.match(/(?:[A-Za-z]+Error|Exception):\s*(.+)$/)
    if (m) return stripHtml(m[1])
  }
  return stripHtml(lines[0] || '')
}

export function parseFrappeErrorDetail(error) {
  // Sem resposta = erro de rede (CORS, offline, servidor caiu)
  if (error && !error.response) {
    return {
      type: 'network',
      title: TYPE_TITLES.network,
      messages: [error.message || 'Sem resposta do servidor. Verifique sua conexão.'],
      statusCode: 0,
      raw: error,
    }
  }

  const status = error?.response?.status
  const data = error?.response?.data || {}

  let type = 'unknown'
  if (data.exc_type && EXC_TYPE_TO_KIND[data.exc_type]) type = EXC_TYPE_TO_KIND[data.exc_type]
  else if (status === 403) type = 'permission'
  else if (status === 409) type = 'duplicate'
  else if (status === 417) type = 'validation'
  else if (status >= 500) type = 'server'

  const collected = new Set()
  const push = (m) => { const s = stripHtml(m); if (s) collected.add(s) }

  parseServerMessages(data._server_messages).forEach(push)
  if (Array.isArray(data.messages)) data.messages.forEach(push)
  if (data._error_message) push(data._error_message)

  // MandatoryError: lista campo a campo (substitui mensagem genérica)
  if (type === 'mandatory') {
    const fields = extractMandatoryFields(data.exception)
    if (fields.length) {
      collected.clear()
      fields.forEach(f => push(`Campo obrigatório: ${f}`))
    }
  }

  if (collected.size === 0) {
    const line = extractExceptionLine(data.exception)
    if (line) push(line)
  }

  if (collected.size === 0) {
    if (error?.message) push(error.message)
    else push(TYPE_TITLES[type] || TYPE_TITLES.unknown)
  }

  return {
    type,
    title: TYPE_TITLES[type] || TYPE_TITLES.unknown,
    messages: [...collected],
    statusCode: status ?? 0,
    raw: data,
  }
}

// Compat: chamadores antigos esperam string | null.
// Mantém comportamento original (apenas 1ª mensagem) e retorna null se
// não encontrou nada parseável (deixa o caller usar fallback `||`).
export function parseFrappeError(error) {
  const data = error?.response?.data
  if (!data) return null
  const detail = parseFrappeErrorDetail(error)
  return detail?.messages?.[0] || null
}
