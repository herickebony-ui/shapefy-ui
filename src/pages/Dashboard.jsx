import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, UserX, CalendarPlus, Plus, RefreshCw, Trash2, Link2, AlertTriangle, Archive, Info } from 'lucide-react'
import { listarAlunos, criarAluno, buscarStatsAlunos, excluirAluno, salvarAluno } from '../api/alunos'
import { listarVinculosAluno, excluirVinculosExcluiveis } from '../api/alunoVinculos'
import { parseFrappeError } from '../utils/frappeErrors'
import {
  Button, Badge, DataTable, Spinner,
  Modal, FormGroup, Input, Select, BotaoTutoriais,
} from '../components/ui'
import { TUTORIAIS_MEUS_ALUNOS } from '../data/tutoriais'
import ListPage from '../components/templates/ListPage'
import OnboardingModal from '../components/OnboardingModal'
import JornadaInicial from '../components/JornadaInicial'
import useOnboardingStore from '../store/onboardingStore'
import useErrorModal from '../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const PAGE_SIZE = 30
const FETCH_LIMIT = 500

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
  const navigate = useNavigate()
  // List
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroSexo, setFiltroSexo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const debounceRef = useRef(null)

  // Stats
  const [stats, setStats] = useState({ total: null, ativos: null, inativos: null, novos: null })

  // Modal excluir/desativar
  const [alunoExcluir, setAlunoExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [vinculos, setVinculos] = useState(null) // { checking, categorias[], total, temProtegidos, podeExcluir }
  const [confirmaExclusao, setConfirmaExclusao] = useState(false)
  const [progresso, setProgresso] = useState(null) // { done, total, current }
  const [erroExcluir, setErroExcluir] = useState(null)
  const [falhasParciais, setFalhasParciais] = useState(null) // [{label,name,erro}]

  // Modal novo aluno
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novoAluno, setNovoAluno] = useState({ nome_completo: '', email: '', telefone: '', sexo: '' })

  const errorModal = useErrorModal()

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

  // Pré-checa TODOS os DocTypes vinculados ao aluno ao abrir o modal
  useEffect(() => {
    if (!alunoExcluir) {
      setVinculos(null)
      setConfirmaExclusao(false)
      setProgresso(null)
      setErroExcluir(null)
      setFalhasParciais(null)
      return
    }
    setVinculos({ checking: true, categorias: [], total: 0, temProtegidos: false, podeExcluir: true })
    setErroExcluir(null)
    setFalhasParciais(null)
    let cancelado = false
    listarVinculosAluno(alunoExcluir.name)
      .then(res => { if (!cancelado) setVinculos({ checking: false, ...res }) })
      .catch(e => {
        console.error(e)
        if (!cancelado) {
          setVinculos({ checking: false, categorias: [], total: 0, temProtegidos: false, podeExcluir: false })
          setErroExcluir(parseFrappeError(e) || 'Não foi possível verificar os vínculos do aluno.')
        }
      })
    return () => { cancelado = true }
  }, [alunoExcluir])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAlunos({
        search: queryBusca,
        enabled: filtroStatus,
        sexo: filtroSexo,
        limit: FETCH_LIMIT,
      })
      setAlunos(res.list)
    } catch (e) {
      errorModal.show(e, 'Listar alunos')
    } finally {
      setLoading(false)
    }
    // errorModal é objeto novo a cada render — usá-lo como dep cria loop
    // infinito. .show é useCallback interno (estável), então ignorar é seguro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryBusca, filtroStatus, filtroSexo])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    buscarStatsAlunos().then(setStats).catch(e => errorModal.show(e, 'Carregar estatísticas'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshCounts = useOnboardingStore(s => s.refreshCounts)
  useEffect(() => {
    refreshCounts().catch(e => errorModal.show(e, 'Atualizar contadores'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounts])

  const handleExcluir = async () => {
    if (!alunoExcluir || !vinculos?.podeExcluir) return
    const temExcluiveis = (vinculos?.totalExcluiveis || 0) > 0
    setExcluindo(true)
    setErroExcluir(null)
    setFalhasParciais(null)
    try {
      if (temExcluiveis) {
        setProgresso({ done: 0, total: vinculos.totalExcluiveis, current: null })
        const { ok, falhas } = await excluirVinculosExcluiveis(alunoExcluir.name, (p) => setProgresso(p))
        if (!ok) {
          setFalhasParciais(falhas)
          setErroExcluir(`${falhas.length} registro(s) não foram removidos. Tente novamente.`)
          const novo = await listarVinculosAluno(alunoExcluir.name)
          setVinculos({ checking: false, ...novo })
          return
        }
      }
      await excluirAluno(alunoExcluir.name)
      setAlunoExcluir(null)
      carregar()
      buscarStatsAlunos().then(setStats).catch(e => errorModal.show(e, 'Atualizar estatísticas'))
    } catch (e) {
      console.error(e)
      setErroExcluir(parseFrappeError(e) || 'Não foi possível excluir o aluno.')
    } finally {
      setExcluindo(false)
      setProgresso(null)
    }
  }

  const handleDesativar = async () => {
    if (!alunoExcluir) return
    setExcluindo(true)
    setErroExcluir(null)
    try {
      await salvarAluno(alunoExcluir.name, { enabled: 0 })
      setAlunoExcluir(null)
      carregar()
      buscarStatsAlunos().then(setStats).catch(e => errorModal.show(e, 'Atualizar estatísticas'))
    } catch (e) {
      console.error(e)
      setErroExcluir(parseFrappeError(e) || 'Não foi possível desativar o aluno.')
    } finally {
      setExcluindo(false)
    }
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
      buscarStatsAlunos().then(setStats).catch(e => errorModal.show(e, 'Atualizar estatísticas'))
    } catch (e) {
      errorModal.show(e, 'Criar aluno')
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
            <BotaoTutoriais videos={TUTORIAIS_MEUS_ALUNOS} />
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="secondary" size="sm" icon={Link2} onClick={() => navigate('/meu-link-cadastro')}>
              <span className="hidden sm:inline">Link de cadastro</span>
            </Button>
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
        <JornadaInicial />

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
            onRowClick={(row) => navigate(`/alunos/${encodeURIComponent(row.name)}`)}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
          />
        )}
      </ListPage>

      <OnboardingModal />

      {alunoExcluir && (() => {
        const checando = vinculos?.checking
        const protegidos = (vinculos?.categorias || []).filter(c => !c.excluivel && c.total > 0)
        const excluiveis = (vinculos?.categorias || []).filter(c => c.excluivel && c.total > 0)
        const modo = checando
          ? 'checking'
          : vinculos?.temProtegidos ? 'desativar'
          : vinculos?.total > 0 ? 'excluirComDocs'
          : 'excluirDireto'

        const titulo =
          modo === 'desativar' ? 'Não é possível excluir — desativar?'
          : modo === 'excluirComDocs' ? 'Excluir aluno e documentos clínicos?'
          : 'Excluir aluno?'

        const podeAcionar = !excluindo && !checando && (modo === 'desativar' || confirmaExclusao || modo === 'excluirDireto')

        return (
          <Modal
            isOpen
            onClose={() => { if (!excluindo) setAlunoExcluir(null) }}
            title={titulo}
            size="md"
            closeOnOverlayClick={!excluindo}
            footer={
              <>
                <Button variant="ghost" onClick={() => setAlunoExcluir(null)} disabled={excluindo}>Cancelar</Button>
                {modo === 'desativar' ? (
                  <Button variant="primary" icon={Archive} loading={excluindo} disabled={!podeAcionar} onClick={handleDesativar}>
                    Desativar aluno
                  </Button>
                ) : (
                  <Button variant="danger" loading={excluindo} disabled={!podeAcionar} onClick={handleExcluir}>
                    {modo === 'excluirComDocs' ? `Excluir (${(vinculos.totalExcluiveis || 0) + 1})` : 'Excluir'}
                  </Button>
                )}
              </>
            }
          >
            {checando ? (
              <div className="p-6 flex items-center justify-center gap-3 text-sm text-gray-400">
                <Spinner size="sm" />
                <span>Verificando vínculos do aluno…</span>
              </div>
            ) : excluindo && progresso ? (
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-300">
                  Removendo documentos clínicos de <span className="text-white font-semibold">{alunoExcluir.nome_completo}</span>…
                </p>
                <div className="w-full h-2 bg-[#1a1a1a] rounded overflow-hidden border border-[#323238]">
                  <div
                    className="h-full bg-[#2563eb] transition-all"
                    style={{ width: `${progresso.total ? (progresso.done / progresso.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {progresso.done} de {progresso.total} removidos
                  {progresso.current ? ` · ${progresso.current.label}` : ''}
                </p>
              </div>
            ) : modo === 'desativar' ? (() => {
              const todos = (vinculos.categorias || []).filter(c => c.total > 0)
              return (
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <Info size={16} className="text-yellow-400" />
                  </div>
                  <div className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-white font-semibold">{alunoExcluir.nome_completo}</span> tem registros de histórico que não podem ser apagados (proteção LGPD / prova de atendimento). Você pode <span className="text-white font-semibold">desativar</span> — o aluno some das listagens ativas e <span className="text-white font-semibold">todo o histórico fica preservado</span>.
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
                    Documentos vinculados ao aluno ({vinculos.total})
                  </p>
                  <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] divide-y divide-[#323238]/60 max-h-64 overflow-y-auto">
                    {todos.map(cat => (
                      <div key={cat.key} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white text-xs font-medium truncate">{cat.label}</span>
                          {!cat.excluivel && (
                            <span className="text-[9px] text-yellow-400 uppercase tracking-wider shrink-0">protegido</span>
                          )}
                        </div>
                        <Badge variant={cat.excluivel ? 'default' : 'warning'} size="sm">{cat.total}</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                    Itens <span className="text-yellow-400">protegidos</span> nunca são apagados automaticamente. Os demais permanecem associados ao aluno desativado.
                  </p>
                </div>

                {erroExcluir && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{erroExcluir}</p>
                  </div>
                )}
              </div>
              )
            })() : modo === 'excluirComDocs' ? (() => {
              const temSensiveis = excluiveis.some(c => c.sensivel && c.total > 0)
              return (
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                  <div className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-white font-semibold">{alunoExcluir.nome_completo}</span> tem{' '}
                    <span className="text-white font-semibold">{vinculos.totalExcluiveis}</span> documento(s) vinculado(s). Serão apagados junto com o aluno.
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] divide-y divide-[#323238]/60 max-h-48 overflow-y-auto">
                  {excluiveis.map(cat => (
                    <div key={cat.key} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-white text-xs font-medium">
                        {cat.label}
                        {cat.sensivel && <span className="ml-2 text-[10px] text-yellow-400 uppercase tracking-wider">histórico</span>}
                      </span>
                      <Badge variant="danger" size="sm">{cat.total}</Badge>
                    </div>
                  ))}
                </div>

                {temSensiveis && (
                  <div className="flex items-start gap-2.5 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200/90 leading-relaxed">
                      <span className="font-semibold">Atenção:</span> isso inclui registros de execução (treinos/aeróbicos realizados). Esse histórico não tem como recuperar — considere <span className="font-semibold">desativar o aluno</span> se quiser preservá-lo.
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmaExclusao}
                    onChange={(e) => setConfirmaExclusao(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red-500 shrink-0"
                  />
                  <span className="text-xs text-gray-300 leading-relaxed">
                    Tenho certeza — esta ação é <span className="text-white font-semibold">irreversível</span>.
                  </span>
                </label>

                {falhasParciais && falhasParciais.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                    <p className="text-xs text-red-300 font-semibold">
                      {falhasParciais.length} registro(s) não puderam ser removidos:
                    </p>
                    <p className="text-[11px] text-red-200/80 leading-relaxed">
                      <span className="font-semibold">Motivo:</span> {falhasParciais[0].erro}
                    </p>
                  </div>
                )}

                {erroExcluir && !falhasParciais && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{erroExcluir}</p>
                  </div>
                )}
              </div>
              )
            })() : (
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-300">
                  Tem certeza que deseja excluir <span className="text-white font-semibold">{alunoExcluir.nome_completo}</span>? Esta ação não pode ser desfeita.
                </p>
                {erroExcluir && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{erroExcluir}</p>
                  </div>
                )}
              </div>
            )}
          </Modal>
        )
      })()}

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
      {errorModal.element}
    </>
  )
}
