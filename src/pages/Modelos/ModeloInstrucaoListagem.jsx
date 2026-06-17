import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, AlertCircle, Trash2, FileText, Search,
  Check, Copy, ToggleLeft, ToggleRight, Settings,
} from 'lucide-react'
import {
  listarModelosInstrucao, criarModeloInstrucao, salvarModeloInstrucao,
  excluirModeloInstrucao, duplicarModeloInstrucao,
  SEGMENTOS_INSTRUCAO, rotuloModelo,
} from '../../api/modelos'
import {
  Button, FormGroup, Input, Textarea, Modal, EmptyState, DataTable, Badge,
} from '../../components/ui'
import { buscarSmart } from '../../utils/strings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (v) => {
  if (!v) return '—'
  const s = String(v).slice(0, 10)
  const [y, mo, d] = s.split('-')
  if (!y || !mo || !d) return '—'
  return `${d}/${mo}/${y}`
}

// Checkboxes dieta/treino/econômico — os mesmos do aluno (casam direto).
const CheckSegmentos = ({ valores, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {SEGMENTOS_INSTRUCAO.map((s) => {
      const on = !!valores[s.key]
      return (
        <button key={s.key} type="button"
          onClick={() => onChange({ ...valores, [s.key]: on ? 0 : 1 })}
          className={`inline-flex items-center gap-2 px-3 h-9 rounded-lg border text-sm transition-colors ${
            on ? 'bg-[#2563eb]/10 border-[#2563eb]/50 text-white' : 'bg-[#29292e] border-[#323238] text-gray-300 hover:border-gray-500'
          }`}>
          <span className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
            on ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#4a4a52]'
          }`}>
            {on && <Check size={11} className="text-white" />}
          </span>
          {s.label}
        </button>
      )
    })}
  </div>
)

// ─── Modal: Novo modelo ───────────────────────────────────────────────────────

const ModalNovoModelo = ({ onClose, onCriado }) => {
  const [titulo, setTitulo] = useState('')
  const [seg, setSeg] = useState({ dieta: 0, treino: 0, economico: 0 })
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleCriar = async () => {
    if (!titulo.trim()) return
    setSalvando(true)
    try {
      const nova = await criarModeloInstrucao({
        titulo: titulo.trim(),
        ...seg,
        descricao: descricao.trim(),
        blocos_json: '[]',
      })
      onCriado(nova)
    } catch (e) {
      alert('Erro ao criar modelo: ' + (e?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Novo modelo de instrução"
      subtitle="Crie o modelo e depois monte o conteúdo por blocos."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Plus} onClick={handleCriar} loading={salvando} disabled={!titulo.trim()}>
            Criar e montar
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <FormGroup label="Título" required>
          <Input value={titulo} onChange={setTitulo} placeholder="Ex: Instruções Iniciais — Dieta" />
        </FormGroup>
        <FormGroup label="Para quem" hint="Marque os mesmos checkboxes do aluno. Ex: Dieta + Econômico = instrução de dieta econômica.">
          <CheckSegmentos valores={seg} onChange={setSeg} />
        </FormGroup>
        <FormGroup label="Descrição">
          <Textarea value={descricao} onChange={setDescricao} placeholder="Pra que serve este modelo…" rows={3} />
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── Modal: Editar metadados ──────────────────────────────────────────────────

const ModalEditarModelo = ({ modelo, onClose, onSalvo }) => {
  const [titulo, setTitulo] = useState(modelo?.titulo || '')
  const [seg, setSeg] = useState({
    dieta: modelo?.dieta || 0, treino: modelo?.treino || 0, economico: modelo?.economico || 0,
  })
  const [descricao, setDescricao] = useState(modelo?.descricao || '')
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!titulo.trim()) return
    setSalvando(true)
    try {
      const atualizado = await salvarModeloInstrucao(modelo.name, {
        titulo: titulo.trim(),
        ...seg,
        descricao: descricao.trim(),
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
      subtitle="O conteúdo (blocos) é editado clicando na linha."
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
          <Input value={titulo} onChange={setTitulo} />
        </FormGroup>
        <FormGroup label="Para quem" hint="Os mesmos checkboxes do aluno.">
          <CheckSegmentos valores={seg} onChange={setSeg} />
        </FormGroup>
        <FormGroup label="Descrição">
          <Textarea value={descricao} onChange={setDescricao} rows={3} />
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ModeloInstrucaoListagem() {
  const navigate = useNavigate()
  const [modelos, setModelos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Lista pequena: filtro local com buscarSmart garante acento + coringa.
      const { list } = await listarModelosInstrucao({ limit: 200 })
      const filtrada = query ? list.filter(m => buscarSmart([m.titulo, m.descricao], query)) : list
      setModelos(filtrada)
    } catch (err) {
      setError(err?.message || 'Erro ao buscar modelos')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { carregar() }, [carregar])

  const handleExcluir = async (modelo) => {
    if (!window.confirm(`Excluir modelo "${modelo.titulo}"?`)) return
    try {
      await excluirModeloInstrucao(modelo.name)
      await carregar()
    } catch (e) {
      alert('Erro ao excluir: ' + (e?.message || 'desconhecido'))
    }
  }

  const handleSalvouEdicao = (atualizado) => {
    setModelos(prev => prev.map(m => m.name === atualizado.name ? { ...m, ...atualizado } : m))
    setModalEditar(null)
  }

  const handleDuplicar = async (modelo) => {
    try {
      await duplicarModeloInstrucao(modelo.name)
      await carregar()
    } catch (e) {
      alert('Erro ao duplicar: ' + (e?.message || 'desconhecido'))
    }
  }

  const handleToggleAtivo = async (modelo) => {
    const novo = modelo.enabled ? 0 : 1
    try {
      await salvarModeloInstrucao(modelo.name, { enabled: novo })
      setModelos(prev => prev.map(m => m.name === modelo.name ? { ...m, enabled: novo } : m))
    } catch (e) {
      alert('Erro ao atualizar: ' + (e?.message || 'desconhecido'))
    }
  }

  const colunas = [
    {
      label: 'Título',
      headerClass: 'min-w-[240px]',
      render: (m) => (
        <>
          <p className="text-white font-semibold text-sm truncate">{m.titulo || '—'}</p>
          {m.descricao && <p className="text-gray-500 text-xs mt-0.5 truncate">{m.descricao}</p>}
          <p className="text-gray-600 text-[10px] mt-0.5">modificado em: {formatDate(m.modified)}</p>
        </>
      ),
    },
    {
      label: 'Para quem',
      headerClass: 'min-w-[150px]',
      render: (m) => {
        const r = rotuloModelo(m)
        return r === '—'
          ? <span className="text-gray-600 text-xs">—</span>
          : <Badge variant={m.economico ? 'orange' : 'info'} size="sm">{r}</Badge>
      },
    },
    {
      label: 'Ações',
      headerClass: 'min-w-[170px]',
      render: (m) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggleAtivo(m)}
            title={m.enabled ? 'Ativo (aparece pro aluno) — clique p/ desativar' : 'Inativo — clique p/ ativar'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors ${
              m.enabled
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
            }`}
          >
            {m.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          </button>
          <button
            onClick={() => setModalEditar(m)}
            title="Configurações do modelo (título, checkboxes, descrição)"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <Settings size={12} />
          </button>
          <button
            onClick={() => handleDuplicar(m)}
            title="Duplicar modelo"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <Copy size={12} />
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
      {modalNovo && (
        <ModalNovoModelo
          onClose={() => setModalNovo(false)}
          onCriado={(nova) => { setModalNovo(false); navigate(`/modelos/instrucoes/${nova.name}`) }}
        />
      )}
      {modalEditar && (
        <ModalEditarModelo
          modelo={modalEditar}
          onClose={() => setModalEditar(null)}
          onSalvo={handleSalvouEdicao}
        />
      )}

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[18px] md:text-xl font-bold text-white tracking-tight">Modelos de Instrução</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              O aluno vê o modelo ativo cujos checkboxes batem com os dele. Clique numa linha pra editar os blocos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} title="Atualizar" />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalNovo(true)}>Novo modelo</Button>
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
            title={query ? 'Nenhum modelo encontrado' : 'Nenhum modelo cadastrado'}
            description={
              query
                ? 'Ajuste a busca.'
                : 'Clique em "Novo modelo" para criar sua primeira página de instruções.'
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
            rowHref={(m) => `/modelos/instrucoes/${m.name}`}
            rowKey="name"
          />
        )}
      </div>
    </div>
  )
}
