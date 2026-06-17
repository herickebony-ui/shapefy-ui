import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, AlertCircle, Trash2, FileText,
  X, Search, Target, BarChart2, Tag,
} from 'lucide-react'
import {
  listarModelosFicha, excluirModeloFicha, buscarModeloFicha, salvarModeloFicha,
  aplicarModeloFicha, CATEGORIAS_FICHA,
} from '../../api/modelos'
import { listarAlunos } from '../../api/alunos'
import { criarFicha } from '../../api/fichas'
import {
  Button, FormGroup, Input, Select, Textarea, Autocomplete, Modal,
  EmptyState, DataTable,
} from '../../components/ui'
import { buscarSmart } from '../../utils/strings'
import ModalCriarModeloDoZero from './ModalCriarModeloDoZero'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (v) => {
  if (!v) return '—'
  const s = String(v).slice(0, 10)
  const [y, mo, d] = s.split('-')
  if (!y || !mo || !d) return '—'
  return `${d}/${mo}/${y}`
}

const buscarAlunosFn = async (q) => {
  if (!q || q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

const todayYMD = () => new Date().toISOString().slice(0, 10)
const addDaysYMD = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Modal: Editar metadados ──────────────────────────────────────────────────

const ModalEditarModelo = ({ modelo, onClose, onSalvo }) => {
  const [titulo, setTitulo] = useState(modelo?.titulo || '')
  const [descricao, setDescricao] = useState(modelo?.descricao || '')
  const [categoria, setCategoria] = useState(modelo?.categoria || '')
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!titulo.trim()) return
    setSalvando(true)
    try {
      const atualizado = await salvarModeloFicha(modelo.name, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria || null,
      })
      onSalvo(atualizado)
    } catch (e) {
      alert('Erro ao salvar: ' + (e?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar modelo"
      subtitle="Você só pode editar os metadados. O conteúdo do modelo é congelado."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSalvar} loading={salvando} disabled={!titulo.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <FormGroup label="Título" required>
          <Input value={titulo} onChange={setTitulo} placeholder="Ex: Ficha Hipertrofia ABC Intermediário" />
        </FormGroup>
        <FormGroup label="Categoria">
          <Select
            value={categoria}
            onChange={setCategoria}
            options={CATEGORIAS_FICHA}
            placeholder="Selecione…"
          />
        </FormGroup>
        <FormGroup label="Descrição">
          <Textarea
            value={descricao}
            onChange={setDescricao}
            placeholder="Descreva quando e como usar este modelo…"
            rows={4}
          />
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── Modal: Aplicar modelo ────────────────────────────────────────────────────

const ModalAplicarModelo = ({ modelo, onClose, onAplicado }) => {
  const [aluno, setAluno] = useState(null)
  const [dataInicio, setDataInicio] = useState(todayYMD())
  const [dataFim, setDataFim] = useState(addDaysYMD(30))
  const [aplicando, setAplicando] = useState(false)

  const handleAplicar = async () => {
    if (!aluno) return
    setAplicando(true)
    try {
      const modeloCompleto = await buscarModeloFicha(modelo.name)
      const snapshot = JSON.parse(modeloCompleto.snapshot_json || '{}')

      const payload = aplicarModeloFicha(snapshot, {
        aluno: aluno.name,
        nome_completo: aluno.nome_completo,
        data_de_inicio: dataInicio,
        data_de_fim: dataFim,
      })

      const nova = await criarFicha(payload)
      onAplicado(nova.name)
    } catch (e) {
      console.error(e)
      alert('Erro ao aplicar modelo: ' + (e?.message || 'desconhecido'))
    } finally {
      setAplicando(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Aplicar modelo"
      subtitle={modelo?.titulo}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Plus} onClick={handleAplicar} loading={aplicando} disabled={!aluno}>
            Criar Ficha
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <FormGroup label="Aluno destino" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
              <span className="text-white text-sm">{aluno.nome_completo}</span>
              <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
                <X size={13} />
              </button>
            </div>
          ) : (
            <Autocomplete
              searchFn={buscarAlunosFn}
              onSelect={(a) => setAluno(a)}
              renderItem={(a) => (
                <div>
                  <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                  {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                </div>
              )}
              placeholder="Buscar aluno pelo nome…"
            />
          )}
        </FormGroup>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Início">
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full h-10 px-3 bg-[#29292e] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#2563eb]/60"
            />
          </FormGroup>
          <FormGroup label="Fim">
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full h-10 px-3 bg-[#29292e] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#2563eb]/60"
            />
          </FormGroup>
        </div>
      </div>
    </Modal>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ModeloFichaListagem() {
  const navigate = useNavigate()
  const [modelos, setModelos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalAplicar, setModalAplicar] = useState(null)
  const [modalCriar, setModalCriar] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Lista pequena: busca no servidor depende da collation (acento). Buscamos
      // tudo da categoria e filtramos local com buscarSmart (acento + coringa garantidos).
      const { list } = await listarModelosFicha({ categoria, limit: 200 })
      const filtrada = query ? list.filter(m => buscarSmart([m.titulo, m.descricao], query)) : list
      setModelos(filtrada)
    } catch (err) {
      setError(err?.message || 'Erro ao buscar modelos')
    } finally {
      setLoading(false)
    }
  }, [query, categoria])

  useEffect(() => { carregar() }, [carregar])

  const handleExcluir = async (modelo) => {
    if (!window.confirm(`Excluir modelo "${modelo.titulo}"?`)) return
    try {
      await excluirModeloFicha(modelo.name)
      await carregar()
    } catch (e) {
      alert('Erro ao excluir: ' + (e?.message || 'desconhecido'))
    }
  }

  const handleSalvouEdicao = (atualizado) => {
    setModelos(prev => prev.map(m => m.name === atualizado.name ? { ...m, ...atualizado } : m))
    setModalEditar(null)
  }

  const colunas = [
    {
      label: 'Título',
      headerClass: 'min-w-[200px]',
      render: (m) => (
        <div className="max-w-[240px] lg:max-w-[460px]">
          <p className="text-white font-semibold text-sm truncate">{m.titulo || '—'}</p>
          {m.descricao && <p className="text-gray-500 text-xs mt-0.5 truncate">{m.descricao}</p>}
          <p className="text-gray-600 text-[10px] mt-0.5">modificado em: {formatDate(m.modified)}</p>
        </div>
      ),
    },
    {
      label: 'Categoria',
      headerClass: 'min-w-[130px]',
      render: (m) => m.categoria ? (
        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded border border-[#323238] text-gray-300">
          {m.categoria}
        </span>
      ) : <span className="text-gray-600 text-xs">—</span>,
    },
    {
      label: 'Objetivo',
      headerClass: 'min-w-[140px]',
      render: (m) => (
        <div className="flex items-center gap-1.5 text-gray-300 text-xs">
          {m.objetivo_ref && <Target size={11} className="text-gray-500" />}
          <span>{m.objetivo_ref || '—'}</span>
        </div>
      ),
    },
    {
      label: 'Nível',
      headerClass: 'min-w-[120px]',
      render: (m) => (
        <div className="flex items-center gap-1.5 text-gray-300 text-xs">
          {m.nivel_ref && <BarChart2 size={11} className="text-gray-500" />}
          <span>{m.nivel_ref || '—'}</span>
        </div>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'min-w-[140px]',
      render: (m) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setModalAplicar(m)}
            title="Aplicar modelo a um aluno"
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setModalEditar(m)}
            title="Editar título / categoria / descrição"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <Tag size={12} />
          </button>
          <button
            onClick={() => handleExcluir(m)}
            title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 md:p-8 text-white">
      {modalEditar && (
        <ModalEditarModelo
          modelo={modalEditar}
          onClose={() => setModalEditar(null)}
          onSalvo={handleSalvouEdicao}
        />
      )}
      {modalAplicar && (
        <ModalAplicarModelo
          modelo={modalAplicar}
          onClose={() => setModalAplicar(null)}
          onAplicado={(novaId) => { setModalAplicar(null); navigate(`/fichas/${novaId}`) }}
        />
      )}
      {modalCriar && (
        <ModalCriarModeloDoZero tipo="ficha" isOpen onClose={() => setModalCriar(false)} />
      )}

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[18px] md:text-xl font-bold text-white tracking-tight">Modelos de Ficha</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Clique numa linha pra editar o conteúdo. Use as ações ao lado pra aplicar a um aluno, renomear ou excluir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} title="Atualizar" />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalCriar(true)}>Criar do zero</Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título…"
              icon={({ size }) => <Search size={size} />}
              onClear={search ? () => setSearch('') : undefined}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={categoria}
              onChange={setCategoria}
              options={['', ...CATEGORIAS_FICHA].map(c => ({ value: c, label: c || 'Todas as categorias' }))}
              placeholder="Todas as categorias"
            />
          </div>
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro ao carregar modelos</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={carregar} className="ml-auto">Tentar novamente</Button>
          </div>
        ) : loading ? (
          <div className="border border-[#323238] rounded-lg overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-[#323238] animate-pulse" />
            ))}
          </div>
        ) : modelos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query || categoria ? 'Nenhum modelo encontrado' : 'Nenhum modelo cadastrado'}
            description={
              query || categoria
                ? 'Ajuste os filtros ou limpe a busca.'
                : 'Abra uma ficha e clique em "Salvar como modelo" para começar.'
            }
          />
        ) : (
          <DataTable
            rows={modelos}
            columns={colunas}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            rowHref={(m) => `/modelos/fichas/${m.name}`}
            rowKey="name"
          />
        )}
      </div>
    </div>
  )
}
