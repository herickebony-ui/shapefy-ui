import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, RefreshCw, ChevronRight, Calendar } from 'lucide-react'

const fmtData = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}
const todayISO = () => new Date().toISOString().slice(0, 10)

import { listarAlunos } from '../../api/alunos'
import { listarAnamnesesPorAlunos, listarAnamneses, listarFormularios, vincularAnamnese } from '../../api/anamneses'
import { obterStatusCronogramaAlunos } from '../../api/cronogramaFeedbacks'
import { buscarSmart } from '../../utils/strings'
import {
  Button, Badge, Spinner, EmptyState, DataTable,
  Modal, FormGroup, Select,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import AlunoModal from './AlunoModal'

const PAGE_SIZE = 30

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'Respondido', label: 'Anamnese respondida' },
  { value: 'Enviado', label: 'Anamnese enviada' },
  { value: 'pendente', label: 'Sem anamnese' },
  { value: 'sem_cronograma', label: 'Sem cronograma' },
  { value: 'atrasado_cronograma', label: 'Cronograma atrasado' },
]

export default function HubAlunos() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [anamnesePorAluno, setAnamnesePorAluno] = useState({})
  const [statusCronograma, setStatusCronograma] = useState({})
  const debounceRef = useRef(null)

  // Modal detalhe aluno
  const [alunoAberto, setAlunoAberto] = useState(null)

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
      let lista = res.list
      // Refilter local pra resolver acento e substring (Frappe LIKE pode falhar em "joao" → "João")
      if (queryBusca) {
        lista = lista.filter(a => buscarSmart([a.nome_completo, a.email], queryBusca))
        // Fallback: se nada veio do servidor, tenta carregar sem filtro e refiltrar
        if (lista.length === 0) {
          try {
            const res2 = await listarAlunos({ page: 1, limit: 200 })
            lista = (res2.list || []).filter(a => buscarSmart([a.nome_completo, a.email], queryBusca))
          } catch { /* mantém vazio */ }
        }
      }
      setAlunos(lista)
      setHasMore(res.hasMore)
      const ids = lista.map(a => a.name)
      carregarAnamneses(ids)
      carregarStatusCronograma(ids)
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

  const carregarStatusCronograma = async (ids) => {
    if (!ids.length) return
    try {
      const map = await obterStatusCronogramaAlunos(ids)
      setStatusCronograma(prev => ({ ...prev, ...map }))
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
    if (enviando) return // guard contra double-click
    // Idempotência: se o aluno já tem uma anamnese deste formulário, avisa
    // antes de criar outra (evita duplicação acidental)
    const anamnesesDoAluno = anamnesePorAluno[alunoEnvio.name] || []
    const formNome = formularios.find(f => f.name === formularioSelecionado)?.titulo || formularioSelecionado
    const jaExiste = anamnesesDoAluno.some(a =>
      a.titulo === formNome
      || (a.formulario && a.formulario === formularioSelecionado),
    )
    if (jaExiste && !window.confirm(
      `Esta aluna já tem uma anamnese "${formNome}". Deseja criar mais uma assim mesmo?`,
    )) {
      return
    }
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

  const alunosFiltrados = useMemo(() => {
    if (!filtroStatus) return alunos
    if (filtroStatus === 'sem_cronograma') {
      return alunos.filter(a => {
        const s = statusCronograma[a.name]
        return !s || s.total === 0
      })
    }
    if (filtroStatus === 'atrasado_cronograma') {
      return alunos.filter(a => (statusCronograma[a.name]?.atrasados || 0) > 0)
    }
    return alunos.filter(a => getStatus(a.name) === filtroStatus)
  }, [alunos, filtroStatus, statusCronograma, anamnesePorAluno])

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
      label: 'Cronograma',
      headerClass: 'hidden md:table-cell w-44 text-center',
      cellClass: 'hidden md:table-cell text-center',
      render: (row) => {
        const status = statusCronograma[row.name]
        const planEnd = row.plan_end
        const hoje = todayISO()

        // Sem cronograma criado
        if (!status || status.total === 0) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(row.name)}`)
              }}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/30 hover:bg-[#2563eb]/20 transition-colors"
            >
              Criar →
            </button>
          )
        }

        // Atrasado
        if (status.atrasados > 0) {
          return (
            <Badge variant="danger" size="sm">
              {status.atrasados === 1 ? '1 atraso' : `${status.atrasados} atrasos`}
            </Badge>
          )
        }

        // Plano vencido
        if (planEnd && planEnd < hoje) {
          return <Badge variant="default" size="sm">Plano vencido</Badge>
        }

        // Ativo com próxima data
        if (status.proximo) {
          const proxima = new Date(status.proximo + 'T12:00:00')
          const hojeDate = new Date(hoje + 'T00:00:00')
          const diffDias = Math.floor((proxima - hojeDate) / 86400000)
          let label
          if (diffDias === 0) label = 'Hoje'
          else if (diffDias === 1) label = 'Amanhã'
          else if (diffDias < 7) label = `Em ${diffDias}d`
          else label = `${proxima.getDate()}/${proxima.getMonth() + 1}`
          return <Badge variant="success" size="sm">Próx: {label}</Badge>
        }

        return <Badge variant="default" size="sm">—</Badge>
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
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(row.name)}`)
            }}
            title="Cronograma de feedbacks"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white hover:bg-[#2563eb] border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors"
          >
            <Calendar size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setAlunoAberto(row) }}
            title="Ver detalhes"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <ChevronRight size={12} />
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
