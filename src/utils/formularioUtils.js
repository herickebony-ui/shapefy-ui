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
  texto_curto: { label: 'Texto Curto', hasOpcoes: false, hasHtml: false, isLayout: false, descricao: 'Campo de uma única linha. Ideal para nome, idade, e-mail e respostas curtas.' },
  texto_longo: { label: 'Texto Longo', hasOpcoes: false, hasHtml: false, isLayout: false, descricao: 'Campo de múltiplas linhas. Ideal para relatos, observações e descrições detalhadas.' },
  numero:      { label: 'Número',      hasOpcoes: false, hasHtml: false, isLayout: false, descricao: 'Aceita apenas números inteiros. Ideal para idade, frequência semanal, quantidades.' },
  avaliacao:   { label: 'Avaliação (estrelas)', hasOpcoes: true, opcoesLabel: 'Máximo de estrelas (padrão: 5)', hasHtml: false, isLayout: false, descricao: 'O aluno responde clicando em estrelas. Útil para medir percepção (ex: nível de fome, qualidade do sono).' },
  secao:       { label: 'Quebra de Seção', hasOpcoes: false, hasHtml: false, isLayout: true, descricao: 'Não é uma pergunta — é um divisor visual no formulário. Use para agrupar perguntas relacionadas em blocos, deixando o formulário mais organizado para o aluno (ex: "Histórico de Saúde", "Hábitos Alimentares", "Treino Atual"). O texto digitado vira o título da seção.' },
  selecao:     { label: 'Seleção (lista)', hasOpcoes: true, opcoesLabel: 'Opções — uma por linha', hasHtml: false, isLayout: false, descricao: 'O aluno escolhe uma única opção em uma lista. Liste as opções abaixo, uma por linha.' },
  imagem:      { label: 'Anexar Imagem', hasOpcoes: false, hasHtml: false, isLayout: false, descricao: 'Permite o aluno anexar uma foto. Útil para fotos de progresso, prato de comida, postura.' },
  multipla:    { label: 'Múltipla Escolha', hasOpcoes: true, opcoesLabel: 'Opções — uma por linha', hasHtml: false, isLayout: false, descricao: 'O aluno pode marcar várias opções. Liste as opções abaixo, uma por linha.' },
  html:        { label: 'Bloco HTML', hasOpcoes: false, hasHtml: true, isLayout: true, feedbackOnly: true, descricao: 'Não é uma pergunta — é um bloco de texto formatado para passar instruções, avisos ou contexto pro aluno. Ele apenas lê, sem responder.' },
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
