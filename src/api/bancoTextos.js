import client from './client'

const encode = (dt) => encodeURIComponent(dt)
const frappeOwner = () => localStorage.getItem('frappe_user') || ''

// DocTypes que já têm `if_owner=1` configurado no Frappe — o backend garante
// isolamento multi-tenant automaticamente, então NÃO filtramos por owner no
// front (filtro redundante + sobrecarga de query). Os DocTypes antigos (Treino
// Observacao, Alongamento Observacao, Instrucao Aerobico, Frequencia Aerobico,
// Legendas) têm `if_owner=0` e precisam do filtro do front.
const DOCTYPES_COM_ISOLAMENTO_NO_BACKEND = new Set([
  'Orientacao Geral Treino',
  'Orientacao Treino Bloco',
  'Orientacao Alongamento',
  'Orientacao Aerobico',
  'Repeticao Treino',
  'Descanso Treino',
  'Dieta Descricao Geral',
  'Dieta Observacao',
])

const precisaFiltroOwnerNoFront = (doctype) =>
  !DOCTYPES_COM_ISOLAMENTO_NO_BACKEND.has(doctype)

// Grupos pra navegação em 2 níveis no BancoTextos (ordem importa — usada na UI)
export const GRUPOS_CATEGORIA = [
  { id: 'ficha', label: 'Ficha' },
  { id: 'treino', label: 'Treino' },
  { id: 'aerobico', label: 'Aeróbicos' },
  { id: 'alongamento', label: 'Alongamentos' },
  { id: 'dieta', label: 'Dieta' },
]

// Cada categoria pode customizar como o campo principal (`campo`) e o campo extra
// (`extra`) aparecem no formulário do BancoTextos:
//   grupo            → seção em GRUPOS_CATEGORIA (obrigatório pra UI agrupada)
//   campoLabel       → label do campo principal (default: "Texto")
//   campoPlaceholder → placeholder do campo principal (default: "Digite o texto...")
//   campoMultiline   → se false, renderiza Input ao invés de Textarea (default: true)
//   extraLabel       → label do campo extra
//   extraPlaceholder → placeholder do campo extra
//   extraHint        → texto auxiliar abaixo do campo extra
export const CATEGORIAS = [
  // ─── Ficha ───────────────────────────────────────────────────────────────
  {
    id: 'orientacao_geral_treino',
    label: 'Orientações Gerais',
    grupo: 'ficha',
    doctype: 'Orientacao Geral Treino',
    campo: 'orientacao_geral_treino',
    extra: null,
  },
  {
    id: 'orientacao_treino_bloco',
    label: 'Orientações por Treino (A–F)',
    grupo: 'ficha',
    doctype: 'Orientacao Treino Bloco',
    campo: 'orientacao_treino_bloco',
    extra: null,
  },
  // ─── Treino (linhas da tabela) ───────────────────────────────────────────
  {
    id: 'instrucoes_treino',
    label: 'Instruções de Treino',
    grupo: 'treino',
    doctype: 'Treino Observacao',
    campo: 'treino_observacao',
    extra: null,
  },
  {
    id: 'repeticao_treino',
    label: 'Repetições',
    grupo: 'treino',
    doctype: 'Repeticao Treino',
    campo: 'repeticao_treino',
    campoLabel: 'Repetição',
    campoPlaceholder: 'Ex: 12 a 15, AMRAP, 8',
    campoMultiline: false,
    extra: 'descanso_vinculado',
    extraLabel: 'Descanso Vinculado',
    extraPlaceholder: 'Ex: 01:00 a 01:30',
    extraHint: 'Auto-preenche o campo Descanso quando esta rep for selecionada (opcional)',
  },
  {
    id: 'descanso_treino',
    label: 'Descansos',
    grupo: 'treino',
    doctype: 'Descanso Treino',
    campo: 'descanso_treino',
    campoLabel: 'Descanso',
    campoPlaceholder: 'Ex: 00:45 a 01:30',
    campoMultiline: false,
    extra: null,
  },
  // ─── Aeróbicos ────────────────────────────────────────────────────────────
  {
    id: 'orientacao_aerobico',
    label: 'Orientações de Aeróbicos',
    grupo: 'aerobico',
    doctype: 'Orientacao Aerobico',
    campo: 'orientacao_aerobico',
    extra: null,
  },
  {
    id: 'instrucoes_aerobicos',
    label: 'Instruções por Aeróbico',
    grupo: 'aerobico',
    doctype: 'Instrucao Aerobico',
    campo: 'instrucao_aerobico',
    extra: null,
  },
  {
    id: 'frequencia_aerobicos',
    label: 'Frequências',
    grupo: 'aerobico',
    doctype: 'Frequencia Aerobico',
    campo: 'frequencia_aerobico',
    campoLabel: 'Frequência',
    campoPlaceholder: 'Ex: 2x na semana',
    campoMultiline: false,
    extra: null,
  },
  // ─── Alongamentos ─────────────────────────────────────────────────────────
  {
    id: 'orientacao_alongamento',
    label: 'Orientações de Alongamentos',
    grupo: 'alongamento',
    doctype: 'Orientacao Alongamento',
    campo: 'orientacao_alongamento',
    extra: null,
  },
  {
    id: 'obs_alongamentos',
    label: 'Observações por Alongamento',
    grupo: 'alongamento',
    doctype: 'Alongamento Observacao',
    campo: 'alongamento_observacao',
    extra: null,
  },
  // ─── Dieta ────────────────────────────────────────────────────────────────
  {
    id: 'dieta_descricao_geral',
    label: 'Descrições Gerais',
    grupo: 'dieta',
    doctype: 'Dieta Descricao Geral',
    campo: 'descricao_geral',
    extra: null,
  },
  {
    id: 'dieta_observacao',
    label: 'Observações',
    grupo: 'dieta',
    doctype: 'Dieta Observacao',
    campo: 'dieta_observacao',
    extra: null,
  },
  {
    id: 'legendas_refeicoes',
    label: 'Legendas das Refeições',
    grupo: 'dieta',
    doctype: 'Legendas',
    campo: 'legend',
    extra: 'full_name',
    extraLabel: 'Nome da Refeição',
    extraPlaceholder: 'Ex: Café da Manhã',
    extraHint: 'Identificador do texto (opcional)',
  },
]

export const listarTextos = async (doctype, campo, { busca, apenasAtivos = true, extra = null } = {}) => {
  const fields = ['name', campo, 'enabled']
  if (extra) fields.push(extra)

  const filters = []
  if (precisaFiltroOwnerNoFront(doctype)) {
    const owner = frappeOwner()
    if (owner) filters.push(['owner', '=', owner])
  }
  if (apenasAtivos) filters.push(['enabled', '=', 1])
  if (busca) filters.push([campo, 'like', `%${busca}%`])

  const res = await client.get(`/api/resource/${encode(doctype)}`, {
    params: {
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit: 500,
      order_by: `${campo} asc`,
    },
  })
  return res.data.data || []
}

export const listarTodosTextos = async (doctype, campo, { busca, extra = null } = {}) => {
  const fields = ['name', campo, 'enabled']
  if (extra) fields.push(extra)

  const filters = []
  if (precisaFiltroOwnerNoFront(doctype)) {
    const owner = frappeOwner()
    if (owner) filters.push(['owner', '=', owner])
  }
  if (busca) filters.push([campo, 'like', `%${busca}%`])

  const res = await client.get(`/api/resource/${encode(doctype)}`, {
    params: {
      fields: JSON.stringify(fields),
      filters: JSON.stringify(filters),
      limit: 500,
      order_by: `${campo} asc`,
    },
  })
  return res.data.data || []
}

export const criarTexto = async (doctype, campo, texto, extra = {}) => {
  const res = await client.post(`/api/resource/${encode(doctype)}`, {
    [campo]: texto,
    enabled: 1,
    ...extra,
  })
  return res.data.data
}

export const editarTexto = async (doctype, id, campos) => {
  const res = await client.put(
    `/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`,
    campos,
  )
  return res.data.data
}

export const toggleTexto = async (doctype, id, enabled) => {
  const res = await client.put(
    `/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`,
    { enabled: enabled ? 1 : 0 },
  )
  return res.data.data
}

export const excluirTexto = async (doctype, id) => {
  await client.delete(`/api/resource/${encode(doctype)}/${encodeURIComponent(id)}`)
}

// Salva no banco apenas se não existir entrada normalizada igual.
// Normalização: trim + lowercase + remove pontuação final + colapsa espaços.
const norm = (s) =>
  (s || '').trim().toLowerCase().replace(/[.,;:!?]+$/, '').replace(/\s+/g, ' ')

export const salvarNoBancoSeNovo = async (doctype, campo, valor, extra = {}) => {
  if (!valor?.trim()) return
  const normalizado = norm(valor)
  try {
    const existentes = await listarTextos(doctype, campo, { apenasAtivos: true })
    const jaExiste = existentes.some(item => norm(item[campo] || '') === normalizado)
    if (!jaExiste) await criarTexto(doctype, campo, valor.trim(), extra)
  } catch (e) {
    console.warn(`Banco de textos sync [${doctype}]:`, e.message)
  }
}
