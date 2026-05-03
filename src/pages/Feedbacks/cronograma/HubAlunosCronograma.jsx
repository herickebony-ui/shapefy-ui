import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Calendar as CalendarIcon, AlertCircle, ChevronRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Spinner, EmptyState, Badge, DataTable, Avatar,
} from '../../../components/ui'
import { listarAlunos } from '../../../api/alunos'
import { listarContratos } from '../../../api/contratosAluno'
import { obterStatusCronogramaAlunos } from '../../../api/cronogramaFeedbacks'
import PlanoBadge from '../../../components/financeiro/PlanoBadge'
import { listarPlanos } from '../../../api/planosShapefy'
import { buscarSmart } from '../../../utils/strings'
import { fmtDateBR, todayISO } from './utils'

const PAGE_SIZE = 30
const ALUNO_RECENTE_DIAS = 30

/**
 * Hub de alunos pra escolher quem vai ter o cronograma editado.
 * Substitui o estado vazio + autocomplete simples na tela de Cronograma
 * por aluno. Mostra:
 *  - Cards de stats: ativos, sem cronograma, cronograma atrasado
 *  - Tabela: aluno | plano | vigência | cronograma | próx. feedback
 *  - Filtros: busca, "só sem cronograma", "só atrasado"
 */
export default function HubAlunosCronograma() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState([])
  const [planos, setPlanos] = useState([])
  const [contratosPorAluno, setContratosPorAluno] = useState({})
  const [statusCronograma, setStatusCronograma] = useState({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('') // '' | 'sem_cronograma' | 'atrasado' | 'recentes'
  const [page, setPage] = useState(1)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      // Carrega tudo em paralelo. 1000 alunos = essencialmente "todos" para
      // este hub. Filtragem aplicada client-side: só alunos com contrato OU
      // cadastrados nos últimos 30 dias.
      const [alunosRes, planosRes, contratosRes] = await Promise.all([
        listarAlunos({ limit: 1000 }),
        listarPlanos({ limit: 100 }).catch(() => ({ list: [] })),
        listarContratos({ limit: 1000 }).catch(() => ({ list: [] })),
      ])
      const alunosLista = alunosRes.list || []
      setAlunos(alunosLista)
      setPlanos(planosRes.list || [])

      // Mapa aluno→contrato relevante (vigente > pago-e-não-iniciado > mais recente)
      const hojeISO = todayISO()
      const map = {}
      ;(contratosRes.list || []).forEach((c) => {
        if (!c.aluno) return
        if (c.status_manual === 'Pausado') return
        const cur = map[c.aluno]
        const fim = (c.data_fim || '').slice(0, 10)
        const inicio = (c.data_inicio || '').slice(0, 10)
        const dp = (c.data_pagamento_principal || '').slice(0, 10)
        const ehVigente = inicio && fim && inicio <= hojeISO && hojeISO <= fim
        const ehPago = !inicio && !!dp
        const score = ehVigente ? 3 : ehPago ? 2 : 1
        const curScore = cur?._score || 0
        if (score > curScore || (score === curScore && fim > (cur?.data_fim || ''))) {
          map[c.aluno] = { ...c, _score: score }
        }
      })
      setContratosPorAluno(map)

      // Status do cronograma — só pra alunos com contrato OU recentes
      // (os mesmos que vão ser exibidos depois do filtro client-side)
      const limiarRecente = new Date()
      limiarRecente.setDate(limiarRecente.getDate() - ALUNO_RECENTE_DIAS)
      const limiarISO = limiarRecente.toISOString().slice(0, 10)
      const idsParaStatus = alunosLista
        .filter((a) => map[a.name] || (a.creation && a.creation.slice(0, 10) >= limiarISO))
        .map((a) => a.name)
      if (idsParaStatus.length) {
        try {
          const stat = await obterStatusCronogramaAlunos(idsParaStatus)
          setStatusCronograma(stat || {})
        } catch (e) { console.error(e) }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const planosByName = useMemo(() => {
    const m = {}
    planos.forEach((p) => { m[p.name] = p })
    return m
  }, [planos])

  const lista = useMemo(() => {
    const hojeISO = todayISO()
    const limiarRecente = new Date()
    limiarRecente.setDate(limiarRecente.getDate() - ALUNO_RECENTE_DIAS)
    const limiarISO = limiarRecente.toISOString().slice(0, 10)

    // Só alunos com contrato OU cadastrados nos últimos 30 dias
    const filtrados = alunos.filter((a) => {
      if (contratosPorAluno[a.name]) return true
      if (a.creation && a.creation.slice(0, 10) >= limiarISO) return true
      return false
    })

    return filtrados.map((a) => {
      const c = contratosPorAluno[a.name]
      const sc = statusCronograma[a.name]
      const total = sc?.total || 0
      const proximo = sc?.proximo
      const atrasados = sc?.atrasados || 0

      // Status visual do cronograma
      let cronogramaStatus = 'Sem cronograma'
      let cronogramaCor = 'danger'
      if (total > 0) {
        if (atrasados > 0) {
          cronogramaStatus = `${atrasados} atrasad${atrasados === 1 ? 'a' : 'as'}`
          cronogramaCor = 'warning'
        } else if (proximo) {
          const proxData = new Date(proximo + 'T12:00:00')
          const hoje = new Date(hojeISO + 'T12:00:00')
          const diff = Math.floor((proxData - hoje) / 86400000)
          if (diff < 0) {
            cronogramaStatus = 'Desatualizado'
            cronogramaCor = 'warning'
          } else {
            cronogramaStatus = 'OK'
            cronogramaCor = 'success'
          }
        } else {
          cronogramaStatus = `${total} agendamento${total === 1 ? '' : 's'}`
          cronogramaCor = 'default'
        }
      }
      const ehRecente = a.creation && a.creation.slice(0, 10) >= limiarISO
      return {
        ...a,
        _contrato: c || null,
        _planoCor: c ? planosByName[c.plano]?.cor || 'slate' : null,
        _planoNome: c?.nome_plano_snapshot || c?.plano || null,
        _vigenciaInicio: c?.data_inicio || null,
        _vigenciaFim: c?.data_fim || null,
        _cronogramaStatus: cronogramaStatus,
        _cronogramaCor: cronogramaCor,
        _proximoFeedback: proximo || null,
        _qtdAtrasados: atrasados,
        _temCronograma: total > 0,
        _ehRecente: ehRecente && !c,
      }
    })
  }, [alunos, contratosPorAluno, planosByName, statusCronograma])

  const filtrado = useMemo(() => {
    let l = lista
    if (filtro === 'sem_cronograma') l = l.filter((a) => !a._temCronograma)
    else if (filtro === 'atrasado') l = l.filter((a) => a._qtdAtrasados > 0)
    else if (filtro === 'recentes') l = l.filter((a) => a._ehRecente)
    if (busca) l = l.filter((a) => buscarSmart([a.nome_completo, a.email], busca))
    return l
  }, [lista, busca, filtro])

  // Reset de página quando muda filtro/busca
  useEffect(() => { setPage(1) }, [busca, filtro])

  const stats = useMemo(() => {
    const ativos = lista.filter((a) => a._contrato).length
    const semCronograma = lista.filter((a) => !a._temCronograma).length
    const atrasados = lista.filter((a) => a._qtdAtrasados > 0).length
    const recentes = lista.filter((a) => a._ehRecente).length
    return { ativos, semCronograma, atrasados, recentes, total: lista.length }
  }, [lista])

  const goToAluno = (alunoId) => navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(alunoId)}`)

  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar nome={row.nome_completo} foto={row.foto} size="sm" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{row.nome_completo}</p>
            {row.email && <p className="text-gray-500 text-[11px] truncate hidden sm:block">{row.email}</p>}
          </div>
        </div>
      ),
    },
    {
      label: 'Plano',
      headerClass: 'hidden md:table-cell w-44',
      cellClass: 'hidden md:table-cell',
      render: (row) => row._planoNome
        ? <PlanoBadge nome={row._planoNome} cor={row._planoCor} size="sm" />
        : <span className="text-gray-600 text-xs italic">sem contrato</span>,
    },
    {
      label: 'Vigência',
      headerClass: 'hidden lg:table-cell w-36',
      cellClass: 'hidden lg:table-cell',
      render: (row) => {
        if (!row._vigenciaFim) return <span className="text-gray-600 text-xs">—</span>
        return (
          <div className="text-[11px] text-gray-300">
            <div>{fmtDateBR(row._vigenciaInicio) || '—'}</div>
            <div className="text-gray-500">até {fmtDateBR(row._vigenciaFim)}</div>
          </div>
        )
      },
    },
    {
      label: 'Cronograma',
      headerClass: 'w-36 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <Badge variant={row._cronogramaCor} size="sm">{row._cronogramaStatus}</Badge>
      ),
    },
    {
      label: 'Próx. feedback',
      headerClass: 'hidden md:table-cell w-32 text-center',
      cellClass: 'hidden md:table-cell text-center',
      render: (row) => row._proximoFeedback
        ? <span className="font-mono text-xs text-white">{fmtDateBR(row._proximoFeedback)}</span>
        : <span className="text-gray-600 text-xs">—</span>,
    },
    {
      label: '',
      headerClass: 'w-12',
      cellClass: 'text-right',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); goToAluno(row.name) }}
          title={row._temCronograma ? 'Abrir cronograma' : 'Criar cronograma'}
          className="h-7 w-7 inline-flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
        >
          {row._temCronograma ? <ChevronRight size={12} /> : <Plus size={12} />}
        </button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats — 4 cards clicáveis (filtros) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFiltro('')}
          className={`text-left bg-[#29292e] border rounded-xl p-3 transition-colors ${
            filtro === '' ? 'border-[#2563eb]/40 ring-1 ring-[#2563eb]/30' : 'border-[#323238] hover:border-[#444]'
          }`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total no hub</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </button>
        <button
          onClick={() => setFiltro(filtro === 'sem_cronograma' ? '' : 'sem_cronograma')}
          className={`text-left bg-[#29292e] border rounded-xl p-3 transition-colors ${
            filtro === 'sem_cronograma' ? 'border-red-500/40 ring-1 ring-red-500/30' : 'border-[#323238] hover:border-[#444]'
          }`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Sem cronograma</p>
          <p className={`text-2xl font-bold mt-1 ${stats.semCronograma > 0 ? 'text-red-400' : 'text-gray-500'}`}>
            {stats.semCronograma}
          </p>
        </button>
        <button
          onClick={() => setFiltro(filtro === 'atrasado' ? '' : 'atrasado')}
          className={`text-left bg-[#29292e] border rounded-xl p-3 transition-colors ${
            filtro === 'atrasado' ? 'border-amber-500/40 ring-1 ring-amber-500/30' : 'border-[#323238] hover:border-[#444]'
          }`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Cronograma atrasado</p>
          <p className={`text-2xl font-bold mt-1 ${stats.atrasados > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
            {stats.atrasados}
          </p>
        </button>
        <button
          onClick={() => setFiltro(filtro === 'recentes' ? '' : 'recentes')}
          className={`text-left bg-[#29292e] border rounded-xl p-3 transition-colors ${
            filtro === 'recentes' ? 'border-emerald-500/40 ring-1 ring-emerald-500/30' : 'border-[#323238] hover:border-[#444]'
          }`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Cadastrados ≤30 dias</p>
          <p className={`text-2xl font-bold mt-1 ${stats.recentes > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
            {stats.recentes}
          </p>
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full h-10 pl-9 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 placeholder-gray-600"
        />
      </div>

      {/* Tabela */}
      {filtrado.length === 0 ? (
        <div className="bg-[#29292e] border border-[#323238] rounded-xl">
          <EmptyState
            icon={CalendarIcon}
            title={busca ? 'Nenhum aluno encontrado' : 'Sem alunos para mostrar'}
            description={busca ? `Sem resultados para "${busca}".` : 'Cadastre alunos pra começar a planejar cronogramas.'}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtrado}
          rowKey="name"
          onRowClick={(row) => goToAluno(row.name)}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      )}
    </div>
  )
}
