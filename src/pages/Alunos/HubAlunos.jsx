import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RefreshCw, ChevronRight, Trash2 } from 'lucide-react'

const fmtData = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}
import { listarAlunos, excluirAluno } from '../../api/alunos'
import { listarAnamnesesPorAlunos, listarAnamneses, listarFormularios, vincularAnamnese } from '../../api/anamneses'
import {
  Button, Badge, Spinner, EmptyState, DataTable,
  Modal, FormGroup, Select,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import AlunoModal from './AlunoModal'

const PAGE_SIZE = 30

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'Respondido', label: 'Respondido' },
  { value: 'Enviado', label: 'Enviado' },
  { value: 'pendente', label: 'Sem anamnese' },
]

export default function HubAlunos() {
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [anamnesePorAluno, setAnamnesePorAluno] = useState({})
  const debounceRef = useRef(null)

  // Modal detalhe aluno
  const [alunoAberto, setAlunoAberto] = useState(null)

  // Modal excluir aluno
  const [alunoExcluir, setAlunoExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  // Modal enviar anamnese
  const [alunoEnvio, setAlunoEnvio] = useState(null)
  const [formularios, setFormularios] = useState([])
  const [formularioSelecionado, setFormularioSelecionado] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setQueryBusca(busca); setPage(1) }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  useEffect(() => { setPage(1) }, [filtroStatus])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAlunos({ search: queryBusca, page, limit: PAGE_SIZE })
      setAlunos(res.list)
      setHasMore(res.hasMore)
      carregarAnamneses(res.list.map(a => a.name))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [queryBusca, page])

  useEffect(() => { carregar() }, [carregar])

  const carregarAnamneses = async (ids) => {
    if (!ids.length) return
    try {
      const lista = await listarAnamnesesPorAlunos(ids)
      const map = {}
      lista.forEach(a => {
        if (!map[a.aluno]) map[a.aluno] = []
        map[a.aluno].push(a)
      })
      setAnamnesePorAluno(prev => ({ ...prev, ...map }))
    } catch (e) { console.error(e) }
  }

  const getStatus = (id) => {
    const lista = anamnesePorAluno[id] || []
    if (!lista.length) return 'pendente'
    if (lista.find(a => a.status === 'Respondido')) return 'Respondido'
    if (lista.find(a => a.status === 'Enviado')) return 'Enviado'
    return 'pendente'
  }

  const abrirEnvio = async (aluno, e) => {
    e.stopPropagation()
    setAlunoEnvio(aluno)
    setFormularioSelecionado('')
    if (!formularios.length) {
      const res = await listarFormularios()
      setFormularios(res.list || [])
    }
  }

  const handleEnviar = async () => {
    if (!formularioSelecionado) return alert('Selecione um formulário.')
    setEnviando(true)
    try {
      await vincularAnamnese(alunoEnvio.name, formularioSelecionado, true)
      setAlunoEnvio(null)
      carregarAnamneses([alunoEnvio.name])
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar anamnese.')
    } finally { setEnviando(false) }
  }

  const handleExcluir = async () => {
    if (!alunoExcluir) return
    setExcluindo(true)
    try {
      await excluirAluno(alunoExcluir.name)
      setAlunoExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir aluno.')
    } finally { setExcluindo(false) }
  }

  const alunosFiltrados = filtroStatus
    ? alunos.filter(a => getStatus(a.name) === filtroStatus)
    : alunos

  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{row.nome_completo}</p>
          {row.email && <p className="text-gray-500 text-xs truncate">{row.email}</p>}
          {row.creation && <p className="text-gray-700 text-[10px]">Cadastrado em {fmtData(row.creation)}</p>}
        </div>
      ),
    },
    {
      label: 'Anamnese',
      headerClass: 'hidden sm:table-cell w-36 text-center',
      cellClass: 'hidden sm:table-cell text-center',
      render: (row) => {
        const s = getStatus(row.name)
        if (s === 'Respondido') return <Badge variant="success" size="sm">Respondido</Badge>
        if (s === 'Enviado') return <Badge variant="warning" size="sm">Enviado</Badge>
        return <Badge variant="default" size="sm">Sem anamnese</Badge>
      },
    },
    {
      label: 'Ações',
      headerClass: 'w-32 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => abrirEnvio(row, e)}
            title="Enviar anamnese"
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
          >
            <Send size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setAlunoAberto(row) }}
            title="Ver detalhes"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <ChevronRight size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setAlunoExcluir(row) }}
            title="Excluir aluno"
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Gestão de Anamneses"
        subtitle="Envie e acompanhe anamneses dos seus alunos"
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar por nome...' },
          { type: 'select', value: filtroStatus, onChange: setFiltroStatus, options: STATUS_OPTS },
        ]}
        loading={loading}
        empty={alunosFiltrados.length === 0 && !loading ? {
          title: 'Nenhum aluno encontrado',
          description: busca ? `Sem resultados para "${busca}"` : 'Ajuste os filtros acima',
        } : null}
      >
        {!loading && alunosFiltrados.length > 0 && (
          <DataTable
            columns={columns}
            rows={alunosFiltrados}
            rowKey="name"
            onRowClick={(row) => setAlunoAberto(row)}
            page={page}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            hasMore={hasMore}
          />
        )}
      </ListPage>

      <AlunoModal aluno={alunoAberto} onClose={() => setAlunoAberto(null)} />

      {alunoExcluir && (
        <Modal
          isOpen
          onClose={() => setAlunoExcluir(null)}
          title="Excluir Aluno"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setAlunoExcluir(null)}>Cancelar</Button>
              <Button variant="danger" loading={excluindo} onClick={handleExcluir}>Excluir</Button>
            </>
          }
        >
          <div className="p-4 text-sm text-gray-300">
            Tem certeza que deseja excluir <span className="text-white font-semibold">{alunoExcluir.nome_completo}</span>? Esta ação não pode ser desfeita.
          </div>
        </Modal>
      )}

      {alunoEnvio && (
        <Modal
          isOpen
          onClose={() => setAlunoEnvio(null)}
          title="Enviar Anamnese"
          subtitle={alunoEnvio.nome_completo}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setAlunoEnvio(null)}>Cancelar</Button>
              <Button variant="primary" icon={Send} loading={enviando} onClick={handleEnviar}>Enviar</Button>
            </>
          }
        >
          <div className="p-4">
            <FormGroup label="Formulário de anamnese" required>
              <Select
                value={formularioSelecionado}
                onChange={setFormularioSelecionado}
                options={[
                  { value: '', label: 'Selecionar formulário...' },
                  ...formularios.map(f => ({ value: f.name, label: f.titulo })),
                ]}
              />
            </FormGroup>
          </div>
        </Modal>
      )}
    </>
  )
}
