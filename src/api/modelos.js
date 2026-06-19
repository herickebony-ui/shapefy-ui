import client from './client'
import { filtrosBusca } from '../utils/strings'

const RESOURCE_DIETA = 'Modelo Dieta'
const RESOURCE_FICHA = 'Modelo Ficha'
const RESOURCE_INSTRUCAO = 'Modelo Instrucao'

const META_FIELDS = [
  'name', 'creation', 'modified', 'modified_by', 'owner',
  'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'doctype',
  '_user_tags', '_comments', '_assign', '_liked_by',
]

const DIETA_EXCLUDE_TOP = [
  ...META_FIELDS,
  'aluno', 'nome_completo', 'profissional',
  'date', 'final_date',
  'sexo', 'age', 'frequencia_atividade', 'weight', 'height',
]

const FICHA_EXCLUDE_TOP = [
  ...META_FIELDS,
  'aluno', 'nome_completo', 'profissional',
  'data_de_inicio', 'data_de_fim', 'route',
]

const limparMetaChild = (item) => {
  const clone = { ...item }
  META_FIELDS.forEach(f => delete clone[f])
  return clone
}

const limparArraysChildTables = (obj) => {
  const clone = { ...obj }
  Object.keys(clone).forEach(k => {
    if (Array.isArray(clone[k])) clone[k] = clone[k].map(limparMetaChild)
  })
  return clone
}

// ─── Snapshot helpers ─────────────────────────────────────────────────────────

export const dietaParaSnapshot = (dieta) => {
  const snap = { ...dieta }
  DIETA_EXCLUDE_TOP.forEach(f => delete snap[f])
  return limparArraysChildTables(snap)
}

export const fichaParaSnapshot = (ficha) => {
  const snap = { ...ficha }
  FICHA_EXCLUDE_TOP.forEach(f => delete snap[f])
  return limparArraysChildTables(snap)
}

// ─── Apply helpers ────────────────────────────────────────────────────────────
// profissional não é setado — Frappe auto-preenche pelo usuário autenticado
// (padrão já usado em criarDieta/criarFicha sem campo profissional)

export const aplicarModeloDieta = (snapshot, { aluno, nome_completo, date, final_date, dadosAntropometricos = {} } = {}) => ({
  ...snapshot,
  ...dadosAntropometricos,
  aluno,
  nome_completo,
  date: date || null,
  final_date: final_date || null,
})

export const aplicarModeloFicha = (snapshot, { aluno, nome_completo, data_de_inicio, data_de_fim } = {}) => ({
  ...snapshot,
  aluno,
  nome_completo,
  data_de_inicio: data_de_inicio || null,
  data_de_fim: data_de_fim || null,
})

// ─── Modelo Dieta — CRUD ──────────────────────────────────────────────────────

export const listarModelosDieta = async ({ busca = '', categoria = '', page = 1, limit = 50 } = {}) => {
  const filtros = []
  if (busca) filtros.push(...filtrosBusca(['Modelo Dieta', 'titulo'], busca))
  if (categoria) filtros.push(['Modelo Dieta', 'categoria', '=', categoria])

  const params = {
    fields: JSON.stringify([
      'name', 'titulo', 'descricao', 'categoria', 'tags',
      'total_calories_ref', 'strategy_ref', 'aluno_origem', 'dieta_origem',
      'enabled', 'creation', 'modified',
    ]),
    limit: busca ? 200 : limit,
    limit_start: busca ? 0 : (page - 1) * limit,
    order_by: 'modified desc',
  }
  if (filtros.length) params.filters = JSON.stringify(filtros)

  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_DIETA)}`, { params })
  const list = res.data?.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarModeloDieta = async (name) => {
  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_DIETA)}/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const criarModeloDieta = async (campos) => {
  const res = await client.post(`/api/resource/${encodeURIComponent(RESOURCE_DIETA)}`, campos)
  return res.data?.data
}

export const salvarModeloDieta = async (name, campos) => {
  const res = await client.put(`/api/resource/${encodeURIComponent(RESOURCE_DIETA)}/${encodeURIComponent(name)}`, campos)
  return res.data?.data
}

export const excluirModeloDieta = async (name) => {
  await client.delete(`/api/resource/${encodeURIComponent(RESOURCE_DIETA)}/${encodeURIComponent(name)}`)
}

// ─── Modelo Ficha — CRUD ──────────────────────────────────────────────────────

export const listarModelosFicha = async ({ busca = '', categoria = '', page = 1, limit = 50 } = {}) => {
  const filtros = []
  if (busca) filtros.push(...filtrosBusca(['Modelo Ficha', 'titulo'], busca))
  if (categoria) filtros.push(['Modelo Ficha', 'categoria', '=', categoria])

  const params = {
    fields: JSON.stringify([
      'name', 'titulo', 'descricao', 'categoria', 'tags',
      'objetivo_ref', 'nivel_ref', 'tipo_de_ciclo_ref',
      'aluno_origem', 'ficha_origem',
      'enabled', 'creation', 'modified',
    ]),
    limit: busca ? 200 : limit,
    limit_start: busca ? 0 : (page - 1) * limit,
    order_by: 'modified desc',
  }
  if (filtros.length) params.filters = JSON.stringify(filtros)

  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_FICHA)}`, { params })
  const list = res.data?.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarModeloFicha = async (name) => {
  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_FICHA)}/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const criarModeloFicha = async (campos) => {
  const res = await client.post(`/api/resource/${encodeURIComponent(RESOURCE_FICHA)}`, campos)
  return res.data?.data
}

export const salvarModeloFicha = async (name, campos) => {
  const res = await client.put(`/api/resource/${encodeURIComponent(RESOURCE_FICHA)}/${encodeURIComponent(name)}`, campos)
  return res.data?.data
}

export const excluirModeloFicha = async (name) => {
  await client.delete(`/api/resource/${encodeURIComponent(RESOURCE_FICHA)}/${encodeURIComponent(name)}`)
}

// ─── Modelo Instrucao — CRUD ──────────────────────────────────────────────────

export const listarModelosInstrucao = async ({ busca = '', page = 1, limit = 50 } = {}) => {
  const filtros = []
  if (busca) filtros.push(...filtrosBusca(['Modelo Instrucao', 'titulo'], busca))

  const params = {
    fields: JSON.stringify([
      'name', 'titulo', 'descricao', 'dieta', 'treino', 'economico', 'enabled', 'creation', 'modified',
    ]),
    limit: busca ? 200 : limit,
    limit_start: busca ? 0 : (page - 1) * limit,
    order_by: 'modified desc',
  }
  if (filtros.length) params.filters = JSON.stringify(filtros)

  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_INSTRUCAO)}`, { params })
  const list = res.data?.data || []
  return { list, hasMore: list.length === limit }
}

export const buscarModeloInstrucao = async (name) => {
  const res = await client.get(`/api/resource/${encodeURIComponent(RESOURCE_INSTRUCAO)}/${encodeURIComponent(name)}`)
  return res.data?.data
}

export const criarModeloInstrucao = async (campos) => {
  const res = await client.post(`/api/resource/${encodeURIComponent(RESOURCE_INSTRUCAO)}`, campos)
  return res.data?.data
}

export const salvarModeloInstrucao = async (name, campos) => {
  const res = await client.put(`/api/resource/${encodeURIComponent(RESOURCE_INSTRUCAO)}/${encodeURIComponent(name)}`, campos)
  return res.data?.data
}

export const excluirModeloInstrucao = async (name) => {
  await client.delete(`/api/resource/${encodeURIComponent(RESOURCE_INSTRUCAO)}/${encodeURIComponent(name)}`)
}

export const duplicarModeloInstrucao = async (name) => {
  const orig = await buscarModeloInstrucao(name)
  return criarModeloInstrucao({
    titulo: `${orig.titulo} (cópia)`,
    dieta: orig.dieta || 0,
    treino: orig.treino || 0,
    economico: orig.economico || 0,
    descricao: orig.descricao || '',
    blocos_json: orig.blocos_json || '[]',
  })
}

// Sanitiza o nome do arquivo: tira acento, remove caracteres especiais e troca
// espaço por "_". Evita o bug do iOS (Safari normaliza a URL pra NFC e não acha
// arquivo salvo em NFD) e URLs quebradas por espaço/acento.
const nomeArquivoSeguro = (nome = '') => {
  const i = nome.lastIndexOf('.')
  const ext = i > 0 ? nome.slice(i).toLowerCase() : ''
  const base = (i > 0 ? nome.slice(0, i) : nome)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w.-]+/g, '_')                        // resto vira "_"
    .replace(/_+/g, '_').replace(/^_|_$/g, '')        // limpa "_" duplicados/nas pontas
  return (base || 'arquivo') + ext
}

// Upload genérico de arquivo (PDF/imagem) — sempre público, sem optimize e com
// nome sanitizado.
export const uploadArquivo = async (file) => {
  const seguro = nomeArquivoSeguro(file.name)
  const arquivo = seguro !== file.name ? new File([file], seguro, { type: file.type }) : file
  const formData = new FormData()
  formData.append('file', arquivo)
  formData.append('is_private', '0')
  formData.append('optimize', '0')
  const res = await client.post('/api/method/upload_file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.message?.file_url
}

// Segmentos do modelo de instrução — os mesmos checkboxes do Aluno.
export const SEGMENTOS_INSTRUCAO = [
  { key: 'dieta', label: 'Dieta' },
  { key: 'treino', label: 'Treino' },
  { key: 'economico', label: 'Econômico' },
]

// Rótulo legível a partir dos checkboxes (ex: "Dieta Econômico").
export const rotuloModelo = (m = {}) => {
  const base = m.dieta && m.treino ? 'Dieta + Treino' : m.dieta ? 'Dieta' : m.treino ? 'Treino' : '—'
  return base === '—' ? '—' : base + (m.economico ? ' Econômico' : '')
}

// ─── Categorias (espelham os Select do DocType) ───────────────────────────────

export const CATEGORIAS_DIETA = [
  'Emagrecimento', 'Hipertrofia', 'Manutenção', 'Off Season', 'Cutting', 'Outros',
]

export const CATEGORIAS_FICHA = [
  'Hipertrofia', 'Força', 'Resistência', 'Iniciante', 'Intermediário', 'Avançado', 'Reabilitação', 'Outros',
]
