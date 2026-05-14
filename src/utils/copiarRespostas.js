// Helpers para copiar respostas de Feedback / Anamnese em markdown.
// Formato pensado pra colar em editor de texto ou ChatGPT.

const SECAO_TIPOS = new Set(['Quebra de Seção', 'Quebra de Sessão', 'Section Break'])
const HTML_TIPOS = new Set(['Bloco HTML', 'HTML', 'HTML Block'])
const IMG_TIPOS = new Set(['Anexar Imagem', 'Attach Image'])

const fmtData = (d) => {
  if (!d) return '—'
  const parte = String(d).split(' ')[0]
  const partes = parte.split('-')
  if (partes.length !== 3) return parte
  const [y, m, day] = partes
  return `${day}/${m}/${y}`
}

const formatResposta = (item) => {
  if (!item) return '—'
  const r = item.resposta
  if (r == null || String(r).trim() === '') return '—'
  if (IMG_TIPOS.has(item.tipo)) return String(r)
  // Múltipla escolha vem como "a\nb" ou "a, b" — normaliza pra "a, b".
  return String(r).split(/\n/).map(s => s.trim()).filter(Boolean).join(', ') || '—'
}

const isSecao = (item) => SECAO_TIPOS.has(item?.tipo)
const isHtml = (item) => HTML_TIPOS.has(item?.tipo)

export function formatFeedbackParaCopia(feedback, { tipo = 'Feedback' } = {}) {
  if (!feedback) return ''
  const aluno = feedback.nome_completo || feedback.aluno || 'Aluno'
  const titulo = feedback.titulo || ''
  const data = fmtData(feedback.date || feedback.modified)

  const head = `# ${tipo} — ${aluno}${titulo ? ` — ${titulo}` : ''}`
  const linhas = [head, `Data: ${data}`, '']

  for (const item of (feedback.perguntas_e_respostas || [])) {
    if (!item || isHtml(item)) continue
    if (isSecao(item)) {
      linhas.push(`## ${item.pergunta || ''}`.trim(), '')
      continue
    }
    linhas.push(`P: ${item.pergunta || ''}`)
    linhas.push(`R: ${formatResposta(item)}`)
    linhas.push('')
  }

  return linhas.join('\n').trimEnd() + '\n'
}

export function formatComparacaoParaCopia(feedbacks, { tipo = 'Feedback' } = {}) {
  const lista = (feedbacks || []).filter(Boolean)
  if (!lista.length) return ''
  if (lista.length === 1) return formatFeedbackParaCopia(lista[0], { tipo })

  const aluno = lista[0].nome_completo || lista[0].aluno || 'Aluno'
  const titulo = lista[0].titulo || ''
  const datas = lista.map(f => fmtData(f.date || f.modified))
  const base = lista[0].perguntas_e_respostas || []

  const head = `# Comparação — ${aluno} (${lista.length} avaliações de ${tipo}${titulo ? ` — ${titulo}` : ''})`
  const linhas = [head, `Datas: ${datas.join(' · ')}`, '']

  base.forEach((item, idx) => {
    if (!item || isHtml(item)) return
    if (isSecao(item)) {
      linhas.push(`## ${item.pergunta || ''}`.trim(), '')
      return
    }
    linhas.push(`P: ${item.pergunta || ''}`)
    lista.forEach((fb, i) => {
      const resp = formatResposta(fb.perguntas_e_respostas?.[idx])
      linhas.push(`- ${datas[i]}: ${resp}`)
    })
    linhas.push('')
  })

  return linhas.join('\n').trimEnd() + '\n'
}

export async function copiarTexto(texto) {
  if (!texto) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch (e) {
    console.warn('Clipboard API falhou, tentando fallback', e)
  }
  // Fallback: textarea escondida + execCommand
  try {
    const el = document.createElement('textarea')
    el.value = texto
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch (e) {
    console.error('Fallback de cópia falhou', e)
    return false
  }
}
