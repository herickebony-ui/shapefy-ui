import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, RefreshCw, ClipboardList, Trash2, Eye, Check,
  Send, FileText, AlertCircle, ChevronRight, User,
} from 'lucide-react'
import {
  listarAnamneses, excluirAnamnese, buscarAnamnese, marcarEntregueAnamnese,
} from '../../api/anamneses'
import {
  Button, Badge, Input, Spinner, EmptyState, DataTable,
} from '../../components/ui'
import { buscarSmart } from '../../utils/strings'
import VincularAnamneseModal from '../../components/anamnese/VincularAnamneseModal'
import AnamneseViewerModal from '../../components/anamnese/AnamneseViewerModal'

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'Respondido', label: 'Respondidas' },
  { value: 'Enviado', label: 'Enviadas' },
  { value: 'pendente', label: 'Pendentes' },
]

const ENTREGUE_OPTS = [
  { value: '', label: 'Entrega: todos' },
  { value: 'sim', label: 'Apenas entregues' },
  { value: 'nao', label: 'Apenas não entregues' },
]

export default function AnamneseListagem() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [query, setQuery] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroEntregue, setFiltroEntregue] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [modalVincular, setModalVincular] = useState(false)
  const [anamneseAberta, setAnamneseAberta] = useState(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(busca); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setPage(1) }, [filtroStatus, filtroEntregue])

  const carregar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { list } = await listarAnamneses({ limit: 200 })
      setLista(list)
    } catch (e) { setError(e.message || 'Erro ao carregar anamneses') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const listaFiltrada = useMemo(() => {
    return lista.filter(a => {
      if (query && !buscarSmart([a.nome_completo, a.titulo, a.aluno], query)) return false
      if (filtroStatus) {
        if (filtroStatus === 'pendente') {
          if (a.status === 'Respondido' || a.status === 'Enviado') return false
        } else if (a.status !== filtroStatus) return false
      }
      if (filtroEntregue === 'sim' && !a.entregue) return false
      if (filtroEntregue === 'nao' && a.entregue) return false
      return true
    })
  }, [lista, query, filtroStatus, filtroEntregue])

  const abrirAnamnese = async (a) => {
    setCarregandoDetalhe(true)
    try {
      const doc = await buscarAnamnese(a.name)
      setAnamneseAberta(doc)
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar anamnese.')
    } finally { setCarregandoDetalhe(false) }
  }

  const handleMarcarEntregue = (a) => {
    const anterior = { entregue: a.entregue, data_entrega: a.data_entrega }
    const novoEntregue = a.entregue ? 0 : 1
    setLista(prev => prev.map(x => x.name === a.name
      ? { ...x, entregue: novoEntregue, data_entrega: novoEntregue ? new Date().toISOString() : null }
      : x))
    marcarEntregueAnamnese(a.name, !!novoEntregue).catch(e => {
      console.error(e)
      setLista(prev => prev.map(x => x.name === a.name ? { ...x, ...anterior } : x))
      alert('Erro ao atualizar entrega. Verifique se o campo "entregue" existe no DocType Anamnese.')
    })
  }

  const handleExcluir = async (a) => {
    const msg = a.status === 'Respondido'
      ? `Esta anamnese já foi respondida pelo aluno. Tem certeza que deseja excluir "${a.titulo || a.name}"?`
      : `Excluir "${a.titulo || a.name}"?`
    if (!window.confirm(msg)) return
    setExcluindoId(a.name)
    try {
      await excluirAnamnese(a.name)
      const { list } = await listarAnamneses({ limit: 200 })
      setLista(list)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir anamnese.')
    } finally { setExcluindoId(null) }
  }

  const columns = [
    {
      label: 'Aluno',
      headerClass: 'min-w-[220px]',
      render: (a) => (
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {a.nome_completo || <span className="text-gray-600 italic">sem aluno</span>}
          </p>
          {a.aluno && (
            <p className="text-gray-500 text-xs flex items-center gap-1 truncate">
              <User size={10} />{a.aluno}
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Anamnese',
      headerClass: 'min-w-[220px]',
      render: (a) => (
        <div className="min-w-0">
          <p className="text-gray-300 text-xs font-medium truncate">{a.titulo || a.name}</p>
          <p className="text-gray-600 text-[10px]">{fmtData(a.date)}</p>
        </div>
      ),
    },
    {
      label: 'Status',
      headerClass: 'w-32 text-center',
      cellClass: 'text-center',
      render: (a) => {
        if (a.status === 'Respondido') return <Badge variant="success" size="sm">Respondida</Badge>
        if (a.status === 'Enviado') return <Badge variant="warning" size="sm">Enviada</Badge>
        return <Badge variant="default" size="sm">Pendente</Badge>
      },
    },
    {
      label: 'Entrega',
      headerClass: 'w-44 text-center',
      cellClass: 'text-center',
      render: (a) => (
        <div onClick={e => e.stopPropagation()} className="flex justify-center">
          {a.entregue ? (
            <button
              onClick={() => handleMarcarEntregue(a)}
title={a.data_entrega ? `Entregue em ${fmtData(a.data_entrega)}` : 'Entregue'}
              className="h-7 px-3 flex items-center gap-1.5 text-green-300 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              <Check size={11} /> Entregue
            </button>
          ) : (
            <button
              onClick={() => handleMarcarEntregue(a)}
title="Marcar como entregue ao aluno"
              className="h-7 px-3 flex items-center gap-1.5 text-gray-400 hover:text-white border border-[#323238] hover:bg-green-700 hover:border-green-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
            >
              <Check size={11} /> Marcar entregue
            </button>
          )}
        </div>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (a) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => abrirAnamnese(a)}
            title="Ver / editar"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={() => handleExcluir(a)}
            disabled={excluindoId === a.name}
            title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
    {
      label: '',
      headerClass: 'w-10',
      render: () => <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />,
    },
  ]

  const temFiltroAtivo = !!(filtroStatus || filtroEntregue)

  return (
    <div className="p-8 text-white">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Anamneses</h1>
            <p className="text-gray-400 text-sm mt-1">
              Vincule, envie e acompanhe anamneses dos seus alunos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={carregar}
              loading={loading}
              title="Atualizar"
            />
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setModalVincular(true)}
            >
              Vincular Anamnese
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex-1 min-w-[220px] max-w-md">
            <Input
              value={busca}
              onChange={setBusca}
              placeholder="Buscar por aluno, título ou ID..."
              icon={({ size }) => <ClipboardList size={size} />}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filtroEntregue}
            onChange={e => setFiltroEntregue(e.target.value)}
            className="h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
          >
            {ENTREGUE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {temFiltroAtivo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiltroStatus(''); setFiltroEntregue('') }}
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro ao carregar anamneses</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={carregar} className="ml-auto">
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-[#323238] animate-pulse" />
            ))}
          </div>
        ) : listaFiltrada.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query || temFiltroAtivo ? 'Nenhuma anamnese encontrada' : 'Nenhuma anamnese vinculada'}
            description={
              query || temFiltroAtivo
                ? 'Ajuste a busca ou os filtros'
                : 'Clique em "Vincular Anamnese" para começar'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={listaFiltrada}
            rowKey="name"
            onRowClick={abrirAnamnese}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
          />
        )}
      </div>

      {modalVincular && (
        <VincularAnamneseModal
          onClose={() => setModalVincular(false)}
          onVinculada={() => { carregar() }}
        />
      )}

      {carregandoDetalhe && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60">
          <Spinner />
        </div>
      )}

      {anamneseAberta && (
        <AnamneseViewerModal
          anamnese={anamneseAberta}
          onClose={() => setAnamneseAberta(null)}
          onAtualizada={carregar}
        />
      )}
    </div>
  )
}
