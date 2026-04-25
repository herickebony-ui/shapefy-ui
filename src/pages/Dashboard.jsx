import { useEffect, useState, useRef, useCallback } from 'react'
import { Users, UserCheck, UserX, CalendarPlus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { listarAlunos, criarAluno, buscarStatsAlunos, excluirAluno } from '../api/alunos'
import {
  Button, Badge, DataTable,
  Modal, FormGroup, Input, Select,
} from '../components/ui'
import ListPage from '../components/templates/ListPage'
import AlunoModal from './Alunos/AlunoModal'
import OnboardingBanner from '../components/OnboardingBanner'
import OnboardingModal from '../components/OnboardingModal'
import useOnboardingStore from '../store/onboardingStore'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const PAGE_SIZE = 30

const SEXO_OPTS = [
  { value: '', label: 'Selecionar...' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
]

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: '1', label: 'Ativos' },
  { value: '0', label: 'Inativos' },
]

const SEXO_FILTRO_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
]

const fmtData = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

export default function Dashboard() {
  // List
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef(null)

  // Stats
  const [stats, setStats] = useState({ total: null, ativos: null, inativos: null, novos: null })

  // Modal excluir
  const [alunoExcluir, setAlunoExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  // Modal novo aluno
  const [alunoAberto, setAlunoAberto] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novoAluno, setNovoAluno] = useState({ nome_completo: '', email: '', telefone: '', sexo: '' })

  // Debounce busca
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQueryBusca(busca)
      setPage(1)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [filtroStatus, filtroSexo])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAlunos({
        search: queryBusca,
        enabled: filtroStatus,
        sexo: filtroSexo,
        page,
        limit: PAGE_SIZE,
      })
      setAlunos(res.list)
      setHasMore(res.hasMore)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [queryBusca, filtroStatus, filtroSexo, page])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    buscarStatsAlunos().then(setStats).catch(console.error)
  }, [])

  const refreshCounts = useOnboardingStore(s => s.refreshCounts)
  useEffect(() => { refreshCounts().catch(console.error) }, [refreshCounts])

  const handleExcluir = async () => {
    if (!alunoExcluir) return
    setExcluindo(true)
    try {
      await excluirAluno(alunoExcluir.name)
      setAlunoExcluir(null)
      carregar()
      buscarStatsAlunos().then(setStats).catch(() => {})
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir aluno.')
    } finally { setExcluindo(false) }
  }

  const setField = (campo) => (val) => setNovoAluno(prev => ({ ...prev, [campo]: val }))

  const handleCriar = async () => {
    if (!novoAluno.nome_completo.trim()) return alert('Nome é obrigatório.')
    setSalvando(true)
    try {
      await criarAluno(novoAluno)
      setShowModal(false)
      setNovoAluno({ nome_completo: '', email: '', telefone: '', sexo: '' })
      carregar()
      buscarStatsAlunos().then(setStats).catch(() => {})
    } catch (e) {
      console.error(e)
      alert('Erro ao cadastrar aluno.')
    } finally {
      setSalvando(false)
    }
  }

  const statCards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Ativos', value: stats.ativos, icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: 'Inativos', value: stats.inativos, icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Novos este mês', value: stats.novos, icon: CalendarPlus, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ]

  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.foto && (
            <img
              src={`${FRAPPE_URL}${row.foto}`}
              alt={row.nome_completo}
              className="w-8 h-8 rounded-lg object-cover shrink-0 bg-[#323238]"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{row.nome_completo}</p>
            {row.email && <p className="text-gray-500 text-xs truncate">{row.email}</p>}
            {row.creation && <p className="text-gray-700 text-[10px]">Cadastrado em {fmtData(row.creation)}</p>}
          </div>
        </div>
      ),
    },
    {
      label: 'Sexo',
      headerClass: 'hidden md:table-cell w-24',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <span className="text-gray-500 text-xs">{row.sexo || '—'}</span>
      ),
    },
    {
      label: 'Cadastro',
      headerClass: 'hidden md:table-cell w-28',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <span className="text-gray-500 text-xs">{fmtData(row.creation)}</span>
      ),
    },
    {
      label: 'Status',
      headerClass: 'hidden sm:table-cell w-24 text-center',
      cellClass: 'hidden sm:table-cell text-center',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'danger'} size="sm">
          {row.enabled ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'w-16 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
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
        title="Meus Alunos"
        subtitle="Visão geral · clique num aluno para abrir o perfil completo"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowModal(true)}>
              Novo Aluno
            </Button>
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar por nome...' },
          { type: 'select', value: filtroStatus, onChange: setFiltroStatus, options: STATUS_OPTS },
          { type: 'select', value: filtroSexo, onChange: setFiltroSexo, options: SEXO_FILTRO_OPTS },
        ]}
        loading={loading}
        empty={alunos.length === 0 && !loading ? {
          title: busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado',
          description: busca ? `Sem resultados para "${busca}"` : 'Clique em "Novo Aluno" para cadastrar',
        } : null}
      >
        <OnboardingBanner />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${bg}`}>
              <Icon size={18} className={color} />
              <div>
                <p className="text-white text-lg font-bold leading-tight">
                  {value === null ? <span className="text-gray-600 text-sm">—</span> : value}
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {!loading && alunos.length > 0 && (
          <DataTable
            columns={columns}
            rows={alunos}
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

      <OnboardingModal />

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

      {showModal && (
        <Modal
          isOpen
          onClose={() => setShowModal(false)}
          title="Novo Aluno"
          subtitle="Dados básicos — o restante pode ser preenchido depois no Hub"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleCriar}>Cadastrar</Button>
            </>
          }
        >
          <div className="p-4 space-y-3">
            <FormGroup label="Nome completo" required>
              <Input value={novoAluno.nome_completo} onChange={setField('nome_completo')} placeholder="Nome do aluno" />
            </FormGroup>
            <FormGroup label="E-mail">
              <Input value={novoAluno.email} onChange={setField('email')} type="email" placeholder="email@exemplo.com" />
            </FormGroup>
            <FormGroup label="Telefone">
              <Input value={novoAluno.telefone} onChange={setField('telefone')} placeholder="(00) 00000-0000" />
            </FormGroup>
            <FormGroup label="Sexo">
              <Select value={novoAluno.sexo} onChange={setField('sexo')} options={SEXO_OPTS} />
            </FormGroup>
          </div>
        </Modal>
      )}
    </>
  )
}
