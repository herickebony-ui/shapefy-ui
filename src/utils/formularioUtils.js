// Mapa de conversão Frappe → canonical (suporta inglês e português)
export const TIPO_DO_FRAPPE = {
  'Data': 'texto_curto', 'Texto Curto': 'texto_curto',
  'Small Text': 'texto_longo', 'Texto Longo': 'texto_longo',
  'Int': 'numero', 'Número': 'numero',
  'Rating': 'avaliacao', 'Avaliação': 'avaliacao',
  'Section Break': 'secao', 'Quebra de Seção': 'secao', 'Quebra de Sessão': 'secao',
  'Select': 'selecao', 'Seleção': 'selecao',
  'Attach Image': 'imagem', 'Anexar Imagem': 'imagem',
  'Checks': 'multipla', 'Múltipla Escolha': 'multipla',
  'Bloco HTML': 'html',
}

// Mapa canonical → Frappe por doctype
export const TIPO_PARA_FRAPPE = {
  anamnese: {
    texto_curto: 'Data', texto_longo: 'Small Text', numero: 'Int',
    avaliacao: 'Rating', secao: 'Section Break', selecao: 'Select',
    imagem: 'Attach Image', multipla: 'Checks',
  },
  feedback: {
    texto_curto: 'Texto Curto', texto_longo: 'Texto Longo', numero: 'Número',
    avaliacao: 'Avaliação', secao: 'Quebra de Seção', selecao: 'Seleção',
    imagem: 'Anexar Imagem', multipla: 'Múltipla Escolha', html: 'Bloco HTML',
  },
}

export const TIPOS_CONFIG = {
  texto_curto: { label: 'Texto Curto', hasOpcoes: false, hasHtml: false, isLayout: false },
  texto_longo: { label: 'Texto Longo', hasOpcoes: false, hasHtml: false, isLayout: false },
  numero:      { label: 'Número',      hasOpcoes: false, hasHtml: false, isLayout: false },
  avaliacao:   { label: 'Avaliação (estrelas)', hasOpcoes: true, opcoesLabel: 'Máximo de estrelas (padrão: 5)', hasHtml: false, isLayout: false },
  secao:       { label: 'Quebra de Seção', hasOpcoes: false, hasHtml: false, isLayout: true },
  selecao:     { label: 'Seleção (lista)', hasOpcoes: true, opcoesLabel: 'Opções — uma por linha', hasHtml: false, isLayout: false },
  imagem:      { label: 'Anexar Imagem', hasOpcoes: false, hasHtml: false, isLayout: false },
  multipla:    { label: 'Múltipla Escolha', hasOpcoes: true, opcoesLabel: 'Opções — uma por linha', hasHtml: false, isLayout: false },
  html:        { label: 'Bloco HTML', hasOpcoes: false, hasHtml: true, isLayout: true, feedbackOnly: true },
}

export const TIPOS_ANAMNESE = Object.entries(TIPOS_CONFIG)
  .filter(([k]) => k !== 'html')
  .map(([k, v]) => ({ value: k, label: v.label }))

export const TIPOS_FEEDBACK = Object.entries(TIPOS_CONFIG)
  .map(([k, v]) => ({ value: k, label: v.label }))

export const tipoCanonical = (frappeTipo) =>
  TIPO_DO_FRAPPE[frappeTipo] || 'texto_longo'

export const tipoParaFrappe = (canonical, doctype) =>
  TIPO_PARA_FRAPPE[doctype]?.[canonical] || canonical

export const FREQUENCIA_OPTS = [
  'Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Semestral', 'Anual', 'Personalizado',
].map(v => ({ value: v, label: v }))
