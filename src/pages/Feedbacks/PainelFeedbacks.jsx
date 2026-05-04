import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, ChevronLeft, ChevronRight, Calendar, MessageCircle,
  Eye, Search, AlertCircle, Clock, Check, UserPlus,
  CalendarPlus, CalendarClock, CalendarX, ArrowRight,
} from 'lucide-react'

import {
  Button, Badge, Avatar, DataTable, EmptyState, Modal,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

import { listarAgendamentos } from '../../api/cronogramaFeedbacks'
import { listarAlunos } from '../../api/alunos'

import Toast from './cronograma/Toast'
import { fmtDateBR, todayISO } from './cronograma/utils'

// ─── Helpers de período ──────────────────────────────────────────────────────
const DIAS_NOME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_NOME = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function rangeSemana(offset = 0) {
  const hoje = new Date()
  const dow = hoje.getDay()
  const offsetSegunda = dow === 0 ? -6 : 1 - dow
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() + offsetSegunda + offset * 7)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
    label: `${inicio.getDate()}/${MESES_NOME[inicio.getMonth()]} – ${fim.getDate()}/${MESES_NOME[fim.getMonth()]}`,
    numeroSemana: numeroIsoSemana(inicio),
  }
}

function numeroIsoSemana(d) {
  const data = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dow = data.getUTCDay() || 7
  data.setUTCDate(data.getUTCDate() + 4 - dow)
  const inicioAno = new Date(Date.UTC(data.getUTCFullYear(), 0, 1))
  return Math.ceil(((data - inicioAno) / 86400000 + 1) / 7)
}

function rangeMes() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  }
}

function formatarDataPainel(dataAgendada, hojeISO) {
  if (!dataAgendada) return { label: '—', cor: 'gray' }
  const data = new Date(dataAgendada + 'T12:00:00')
  const hoje = new Date(hojeISO + 'T12:00:00')
  const diffDias = Math.floor((data - hoje) / 86400000)

  if (diffDias === 0) return { label: 'Hoje', cor: 'orange' }
  if (diffDias === 1) return { label: 'Amanhã', cor: 'blue' }
  if (diffDias === -1) return { label: 'Ontem', cor: 'red' }
  if (diffDias < 0) return { label: `há ${Math.abs(diffDias)}d`, cor: 'red' }
  if (diffDias < 7) return { label: DIAS_NOME[data.getDay()], cor: 'gray' }
  return {
    label: `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`,
    cor: 'gray',
  }
}

function statusOperacional(item, hojeISO) {
  const respondido = item.status === 'Respondido' || item.status === 'Concluido'
  if (respondido) return { label: 'Respondido', variant: 'success', icon: Check }
  if (item.data_agendada < hojeISO) return { label: 'Atrasado', variant: 'danger', icon: AlertCircle }
  if (item.data_agendada === hojeISO) return { label: 'Aguardando', variant: 'warning', icon: Clock }
  return { label: 'Agendado', variant: 'default', icon: null }
}

// ═════════════════════════════════════════════════════════════════════════════
export default function PainelFeedbacks() {
  const navigate = useNavigate()

  // ─── Dados base ─────────────────────────────────────────────────────────────
  const [agendamentos, setAgendamentos] = useState([])
  const [alunosPorId, setAlunosPorId] = useState({})
  const [loading, setLoading] = useState(true)

  // ─── Filtros ────────────────────────────────────────────────────────────────
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('esta_semana')
  const [filtroTipo, setFiltroTipo] = useState('') // '', 'feedback', 'troca'
  const [semanaOffset, setSemanaOffset] = useState(0)

  // ─── Modais ─────────────────────────────────────────────────────────────────
  const [modalPendencia, setModalPendencia] = useState(null) // { titulo, descricao, alunos, icon, color }
  const [modalSemResposta, setModalSemResposta] = useState(null) // agendamento sem feedback respondido

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const toastTimerRef = useRef(null)
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimerRef.current)
    setToast({ show: true, msg, type })
    toastTimerRef.current = setTimeout(() => setToast(s => ({ ...s, show: false })), 3000)
  }, [])

  const buscaDebounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(buscaDebounceRef.current)
    buscaDebounceRef.current = setTimeout(() => setQueryBusca(busca), 300)
    return () => clearTimeout(buscaDebounceRef.current)
  }, [busca])

  // ═════════════════════════════════════════════════════════════════════════
  // Carregamento
  // ═════════════════════════════════════════════════════════════════════════
  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const [agsRes, alsRes] = await Promise.all([
        listarAgendamentos({ limit: 1000 }),
        listarAlunos({ limit: 500 }),
      ])
      setAgendamentos(agsRes.list || [])
      const mapAlunos = {}
      ;(alsRes.list || []).forEach(a => { mapAlunos[a.name] = a })
      setAlunosPorId(mapAlunos)
    } catch (e) {
      console.error(e)
      if (!silencioso) showToast('Falha ao carregar', 'error')
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [showToast])

  useEffect(() => { carregar() }, [carregar])

  // Polling 60s em background
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) carregar(true)
    }, 60000)
    return () => clearInterval(interval)
  }, [carregar])

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') setSemanaOffset(s => s - 1)
      else if (e.key === 'ArrowRight') setSemanaOffset(s => s + 1)
      else if (e.key === 'h' || e.key === 'H') setSemanaOffset(0)
      else if (e.key === 'r' || e.key === 'R') carregar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [carregar])

  // ═════════════════════════════════════════════════════════════════════════
  // Derivações
  // ═════════════════════════════════════════════════════════════════════════
  const semana = useMemo(() => rangeSemana(semanaOffset), [semanaOffset])
  const hojeISO = todayISO()

  // Hidrata cada agendamento com nome do aluno (pra busca e exibição)
  const agendamentosHidratados = useMemo(() => {
    return agendamentos.map(a => {
      const aluno = alunosPorId[a.aluno]
      return {
        ...a,
        _alunoNome: aluno?.nome_completo || a.aluno,
        _alunoEmail: aluno?.email || '',
        _alunoTelefone: aluno?.telefone || '',
        _alunoSenha: aluno?.senha_de_acesso || '',
        _alunoFoto: aluno?.foto || '',
      }
    })
  }, [agendamentos, alunosPorId])

  // Stats — sempre na semana atual (não muda quando filtroPeriodo muda)
  const stats = useMemo(() => {
    const semanaAtual = rangeSemana(0)
    const naSemana = agendamentosHidratados.filter(a =>
      !a.is_start &&
      a.data_agendada >= semanaAtual.inicio &&
      a.data_agendada <= semanaAtual.fim,
    )
    return {
      totalSemana: naSemana.length,
      hoje: agendamentosHidratados.filter(a =>
        !a.is_start &&
        a.data_agendada === hojeISO &&
        a.status !== 'Respondido' && a.status !== 'Concluido',
      ).length,
      trocas: naSemana.filter(a => a.is_training).length,
      atrasados: agendamentosHidratados.filter(a =>
        !a.is_start &&
        a.data_agendada < hojeISO &&
        a.status !== 'Respondido' && a.status !== 'Concluido',
      ).length,
    }
  }, [agendamentosHidratados, hojeISO])

  // Pendências de planejamento — foco em alunos (não em agendamentos).
  // Vigentes sem cronograma = plano rodando hoje mas sem nenhum feedback agendado.
  // Pago não iniciado = plano com data_inicio no futuro.
  // Plano vencido = data_fim já passou.
  // Novos sem cronograma = cadastrados ≤30 dias, sem feedback, e sem plano útil (não cobertos pelos outros).
  const pendencias = useMemo(() => {
    const alunos = Object.values(alunosPorId)
    const temFeedback = new Set()
    agendamentos.forEach(a => {
      if (!a.is_start) temFeedback.add(a.aluno)
    })

    // Limite "novo" = 30 dias atrás (em ISO)
    const limiteNovo = new Date()
    limiteNovo.setDate(limiteNovo.getDate() - 30)
    const limiteNovoISO = limiteNovo.toISOString().slice(0, 10)

    const vigentesSemCronograma = []
    const pagosNaoIniciados = []
    const planoVencido = []
    const novosSemCronograma = []

    for (const aluno of alunos) {
      const inicio = (aluno.plan_start || '').slice(0, 10)
      const fim = (aluno.plan_end || '').slice(0, 10)
      const vigente = inicio && fim && inicio <= hojeISO && hojeISO <= fim
      const naoIniciado = inicio && inicio > hojeISO
      const vencido = fim && fim < hojeISO
      const semFeedback = !temFeedback.has(aluno.name)
      const criacaoISO = (aluno.creation || '').slice(0, 10)
      const recemCadastrado = criacaoISO && criacaoISO >= limiteNovoISO

      if (vigente && semFeedback) vigentesSemCronograma.push(aluno)
      if (naoIniciado) pagosNaoIniciados.push(aluno)
      if (vencido) planoVencido.push(aluno)

      // Novo "do zero": cadastrado recente, sem feedback, e não cabe nas outras categorias
      if (recemCadastrado && semFeedback && !vigente && !naoIniciado && !vencido) {
        novosSemCronograma.push(aluno)
      }
    }

    const ordPorFim = (a, b) => (a.plan_end || '').localeCompare(b.plan_end || '')
    const ordPorInicio = (a, b) => (a.plan_start || '').localeCompare(b.plan_start || '')
    const ordPorCriacaoDesc = (a, b) => (b.creation || '').localeCompare(a.creation || '')

    return {
      vigentesSemCronograma: vigentesSemCronograma.sort(ordPorFim),
      pagosNaoIniciados: pagosNaoIniciados.sort(ordPorInicio),
      planoVencido: planoVencido.sort((a, b) => (b.plan_end || '').localeCompare(a.plan_end || '')),
      novosSemCronograma: novosSemCronograma.sort(ordPorCriacaoDesc),
    }
  }, [alunosPorId, agendamentos, hojeISO])

  // Lista filtrada
  const filtrados = useMemo(() => {
    let lista = agendamentosHidratados.filter(a => !a.is_start)

    if (filtroPeriodo === 'esta_semana') {
      lista = lista.filter(a => a.data_agendada >= semana.inicio && a.data_agendada <= semana.fim)
    } else if (filtroPeriodo === 'hoje') {
      lista = lista.filter(a => a.data_agendada === hojeISO)
    } else if (filtroPeriodo === 'mes') {
      const m = rangeMes()
      lista = lista.filter(a => a.data_agendada >= m.inicio && a.data_agendada <= m.fim)
    } else if (filtroPeriodo === 'atrasados') {
      lista = lista.filter(a =>
        a.data_agendada < hojeISO &&
        a.status !== 'Respondido' && a.status !== 'Concluido',
      )
    }

    if (filtroTipo === 'troca') lista = lista.filter(a => a.is_training)
    else if (filtroTipo === 'feedback') lista = lista.filter(a => !a.is_training)

    if (queryBusca) {
      const q = queryBusca.toLowerCase()
      lista = lista.filter(a =>
        (a._alunoNome || '').toLowerCase().includes(q) ||
        (a._alunoEmail || '').toLowerCase().includes(q),
      )
    }

    return lista.sort((a, b) => {
      const dateCmp = (a.data_agendada || '').localeCompare(b.data_agendada || '')
      if (dateCmp !== 0) return dateCmp
      return (a._alunoNome || '').localeCompare(b._alunoNome || '')
    })
  }, [agendamentosHidratados, filtroPeriodo, filtroTipo, queryBusca, semana, hojeISO])

  // ═════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═════════════════════════════════════════════════════════════════════════
  const irParaCronograma = (alunoId) =>
    navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(alunoId)}`)

  // Clique no nome do aluno na lista: abre o feedback respondido daquela linha.
  // Se ainda não foi respondido, abre modal informativo com ações disponíveis.
  const abrirFeedbackDaLinha = (row) => {
    if (row.feedback_resposta) {
      navigate(`/feedbacks/${encodeURIComponent(row.feedback_resposta)}`)
    } else {
      setModalSemResposta(row)
    }
  }

  // Abre o WhatsApp do aluno direto, sem mensagem pré-preenchida.
  // O usuário digita o que quiser na conversa.
  const abrirWhatsapp = (item) => {
    const aluno = alunosPorId[item.aluno]
    if (!aluno?.telefone) {
      showToast('Aluno sem telefone cadastrado', 'error')
      return
    }
    const tel = String(aluno.telefone).replace(/\D/g, '')
    const numero = tel.startsWith('55') ? tel : `55${tel}`
    window.open(`https://wa.me/${numero}`, '_blank')
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Colunas da tabela
  // ═════════════════════════════════════════════════════════════════════════
  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); abrirFeedbackDaLinha(row) }}
          title={row.feedback_resposta ? 'Abrir feedback respondido' : 'Feedback ainda não respondido'}
          className="flex items-center gap-2.5 min-w-0 text-left group/aluno hover:opacity-80 transition-opacity"
        >
          <Avatar nome={row._alunoNome} size="sm" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate group-hover/aluno:text-[#2563eb] transition-colors">
              {row._alunoNome}
            </p>
            {row._alunoEmail && (
              <p className="text-gray-500 text-[11px] truncate hidden sm:block">{row._alunoEmail}</p>
            )}
          </div>
        </button>
      ),
    },
    {
      label: 'Data',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row) => {
        const d = formatarDataPainel(row.data_agendada, hojeISO)
        const cls = {
          orange: 'text-orange-400',
          blue: 'text-blue-400',
          red: 'text-red-400',
          gray: 'text-gray-300',
        }[d.cor]
        return (
          <div className="flex flex-col items-center">
            <span className={`text-xs font-bold ${cls}`}>{d.label}</span>
            <span className="text-[10px] text-gray-600 font-mono">
              {fmtDateBR(row.data_agendada)}
            </span>
          </div>
        )
      },
    },
    {
      label: 'Tipo',
      headerClass: 'hidden sm:table-cell w-24 text-center',
      cellClass: 'hidden sm:table-cell text-center',
      render: (row) => row.is_training
        ? <Badge variant="purple" size="sm">Troca</Badge>
        : <Badge variant="orange" size="sm">Feedback</Badge>,
    },
    {
      label: 'Status',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (row) => {
        const s = statusOperacional(row, hojeISO)
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>
      },
    },
    {
      label: 'Ações',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (row) => {
        const respondido = row.status === 'Respondido' || row.status === 'Concluido'
        const podeCobrar = !respondido && row.data_agendada <= hojeISO
        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => irParaCronograma(row.aluno)}
              title="Abrir cronograma do aluno"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
            >
              <Calendar size={12} />
            </button>
            {podeCobrar && (
              <button
                onClick={() => abrirWhatsapp(row)}
                title="Cobrar via WhatsApp"
                className="h-7 w-7 flex items-center justify-center text-green-400 hover:text-white hover:bg-green-700 border border-[#323238] hover:border-green-600 rounded-lg transition-colors"
              >
                <MessageCircle size={12} />
              </button>
            )}
            {respondido && row.feedback_resposta && (
              <button
                onClick={() => navigate(`/feedbacks/${encodeURIComponent(row.feedback_resposta)}`)}
                title="Ver feedback respondido"
                className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-700 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
              >
                <Eye size={12} />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  // ═════════════════════════════════════════════════════════════════════════
  // Empty state — renderizado dentro do children (porque os cards sempre aparecem)
  // ═════════════════════════════════════════════════════════════════════════
  const renderEmpty = () => {
    if (agendamentos.length === 0) {
      return (
        <EmptyState
          icon={UserPlus}
          title="Nenhum cronograma criado ainda"
          description="Comece criando o cronograma do primeiro aluno."
          action={
            <Button variant="primary" onClick={() => navigate('/cronograma-feedbacks')}>
              Planejar cronograma
            </Button>
          }
        />
      )
    }
    return (
      <EmptyState
        icon={Calendar}
        title="Nada na agenda"
        description={filtroPeriodo === 'esta_semana'
          ? `Nenhum feedback agendado para ${semana.label}.`
          : 'Sem agendamentos com esses filtros.'}
        action={filtroPeriodo !== 'esta_semana' && (
          <Button variant="secondary"
            onClick={() => { setFiltroPeriodo('esta_semana'); setSemanaOffset(0) }}>
            Voltar para esta semana
          </Button>
        )}
      />
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Subtitle dinâmico
  // ═════════════════════════════════════════════════════════════════════════
  const subtitle = filtroPeriodo === 'esta_semana'
    ? `Semana ${semana.numeroSemana} (${semana.label})`
    : 'Operação diária e cobrança de feedbacks'

  return (
    <>
      <ListPage
        title="Central de Feedbacks"
        subtitle={subtitle}
        actions={
          <>
            {filtroPeriodo === 'esta_semana' && (
              <>
                <Button
                  variant="secondary" size="sm" icon={ChevronLeft}
                  onClick={() => setSemanaOffset(s => s - 1)}
                  title="Semana anterior"
                />
                <Button
                  variant="secondary" size="sm" icon={ChevronRight}
                  onClick={() => setSemanaOffset(s => s + 1)}
                  title="Próxima semana"
                />
                {semanaOffset !== 0 && (
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => setSemanaOffset(0)}
                  >
                    Hoje
                  </Button>
                )}
              </>
            )}
            <Button
              variant="secondary" size="sm" icon={RefreshCw}
              onClick={() => carregar()} loading={loading}
            />
          </>
        }
        filters={[
          {
            type: 'search', value: busca, onChange: setBusca,
            placeholder: 'Buscar aluno…', icon: Search,
          },
          {
            type: 'select', value: filtroPeriodo, onChange: (v) => {
              setFiltroPeriodo(v)
              if (v !== 'esta_semana') setSemanaOffset(0)
            },
            options: [
              { value: 'esta_semana', label: 'Esta semana' },
              { value: 'hoje',        label: 'Apenas hoje' },
              { value: 'mes',         label: 'Este mês' },
              { value: 'atrasados',   label: 'Atrasados acumulados' },
              { value: 'todos',       label: 'Todos' },
            ],
          },
          {
            type: 'select', value: filtroTipo, onChange: setFiltroTipo,
            placeholder: 'Tipo',
            options: [
              { value: '',         label: 'Todos os tipos' },
              { value: 'feedback', label: 'Apenas feedbacks' },
              { value: 'troca',    label: 'Apenas trocas' },
            ],
          },
        ]}
        loading={loading}
      >
        {/* Pendências de planejamento — só aparece se há pelo menos uma pendência */}
        {(pendencias.vigentesSemCronograma.length > 0
          || pendencias.pagosNaoIniciados.length > 0
          || pendencias.planoVencido.length > 0
          || pendencias.novosSemCronograma.length > 0) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                Pendências de planejamento
              </span>
              <div className="h-px flex-1 bg-[#323238]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <CardPendencia
                icon={UserPlus}
                label="Alunos novos sem cronograma"
                description="Cadastrados há ≤30 dias e sem nada planejado"
                value={pendencias.novosSemCronograma.length}
                color="blue"
                onClick={() => setModalPendencia({
                  titulo: 'Alunos novos sem cronograma',
                  descricao: 'Esses alunos foram cadastrados nos últimos 30 dias e ainda não têm plano nem cronograma. Comece configurando.',
                  alunos: pendencias.novosSemCronograma,
                  color: 'blue',
                })}
              />
              <CardPendencia
                icon={CalendarPlus}
                label="Vigentes sem cronograma"
                description="Plano rodando, mas sem nenhum feedback agendado"
                value={pendencias.vigentesSemCronograma.length}
                color="amber"
                onClick={() => setModalPendencia({
                  titulo: 'Vigentes sem cronograma',
                  descricao: 'Esses alunos têm plano vigente mas nenhum feedback agendado. Precisam de planejamento agora.',
                  alunos: pendencias.vigentesSemCronograma,
                  color: 'amber',
                })}
              />
              <CardPendencia
                icon={CalendarClock}
                label="Plano pago, não iniciado"
                description="Vai começar — bom planejar com antecedência"
                value={pendencias.pagosNaoIniciados.length}
                color="emerald"
                onClick={() => setModalPendencia({
                  titulo: 'Plano pago, não iniciado',
                  descricao: 'Alunos que pagaram mas o plano ainda não começou. Você pode adiantar o planejamento.',
                  alunos: pendencias.pagosNaoIniciados,
                  color: 'emerald',
                })}
              />
              <CardPendencia
                icon={CalendarX}
                label="Plano vencido"
                description="Já passou — considerar renovação"
                value={pendencias.planoVencido.length}
                color="slate"
                onClick={() => setModalPendencia({
                  titulo: 'Plano vencido',
                  descricao: 'Alunos com plano que já terminou. Considere renovar o ciclo.',
                  alunos: pendencias.planoVencido,
                  color: 'slate',
                })}
              />
            </div>
          </div>
        )}

        {/* Cards clicáveis acima da tabela — sempre visíveis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <CardClicavel
            label="Esta semana" value={stats.totalSemana} unit="alunos"
            color="blue"
            ativo={filtroPeriodo === 'esta_semana' && semanaOffset === 0}
            onClick={() => { setFiltroPeriodo('esta_semana'); setSemanaOffset(0) }}
          />
          <CardClicavel
            label="Para hoje" value={stats.hoje} unit="aguard."
            color="orange"
            ativo={filtroPeriodo === 'hoje'}
            onClick={() => setFiltroPeriodo('hoje')}
          />
          <CardClicavel
            label="Trocas (sem.)" value={stats.trocas} unit="trocas"
            color="purple"
            ativo={filtroTipo === 'troca'}
            onClick={() => setFiltroTipo(filtroTipo === 'troca' ? '' : 'troca')}
          />
          <CardClicavel
            label="Atrasados" value={stats.atrasados} unit="alunos"
            color="red"
            ativo={filtroPeriodo === 'atrasados'}
            onClick={() => setFiltroPeriodo('atrasados')}
          />
        </div>

        {filtrados.length > 0 ? (
          <DataTable
            columns={columns}
            rows={filtrados}
            rowKey="name"
            page={1}
            pageSize={1000}
          />
        ) : (
          renderEmpty()
        )}
      </ListPage>

      {/* Modal de pendência — lista alunos da categoria escolhida */}
      {modalPendencia && (
        <Modal
          isOpen
          onClose={() => setModalPendencia(null)}
          title={modalPendencia.titulo}
          subtitle={`${modalPendencia.alunos.length} aluno${modalPendencia.alunos.length === 1 ? '' : 's'}`}
          size="md"
          footer={
            <Button variant="ghost" onClick={() => setModalPendencia(null)}>Fechar</Button>
          }
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">{modalPendencia.descricao}</p>
            <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 space-y-1.5">
              {modalPendencia.alunos.map(a => (
                <button
                  key={a.name}
                  onClick={() => { setModalPendencia(null); irParaCronograma(a.name) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/40 hover:bg-[#1a1a1a]/80 transition-all text-left group"
                >
                  <Avatar nome={a.nome_completo} foto={a.foto} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{a.nome_completo}</p>
                    <p className="text-gray-500 text-[11px] truncate">
                      {a.plan_start && a.plan_end
                        ? `Plano: ${fmtDateBR(a.plan_start)} → ${fmtDateBR(a.plan_end)}`
                        : a.plan_start
                          ? `Início: ${fmtDateBR(a.plan_start)}`
                          : a.plan_end
                            ? `Fim: ${fmtDateBR(a.plan_end)}`
                            : '—'
                      }
                    </p>
                  </div>
                  <span className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-bold uppercase tracking-widest border border-[#2563eb]/30 group-hover:bg-[#2563eb] group-hover:text-white transition-colors shrink-0">
                    Planejar
                    <ArrowRight size={11} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal informativo: agendamento sem feedback respondido ainda */}
      {modalSemResposta && (() => {
        const s = statusOperacional(modalSemResposta, hojeISO)
        const StatusIcon = s.icon
        const statusColorMap = {
          danger:  { bg: 'bg-red-500/10',    text: 'text-red-300',    border: 'border-red-500/30',    iconBg: 'bg-red-500/20',    iconText: 'text-red-400' },
          warning: { bg: 'bg-amber-500/10',  text: 'text-amber-300',  border: 'border-amber-500/30',  iconBg: 'bg-amber-500/20',  iconText: 'text-amber-400' },
          default: { bg: 'bg-blue-500/10',   text: 'text-blue-300',   border: 'border-blue-500/30',   iconBg: 'bg-blue-500/20',   iconText: 'text-blue-400' },
          success: { bg: 'bg-emerald-500/10',text: 'text-emerald-300',border: 'border-emerald-500/30',iconBg: 'bg-emerald-500/20',iconText: 'text-emerald-400' },
        }
        const c = statusColorMap[s.variant] || statusColorMap.default
        const aluno = alunosPorId[modalSemResposta.aluno]
        const podeCobrar = !!aluno?.telefone
        return (
          <Modal
            isOpen
            onClose={() => setModalSemResposta(null)}
            title="Feedback ainda não respondido"
            subtitle={modalSemResposta._alunoNome}
            size="md"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalSemResposta(null)}>Fechar</Button>
                <Button
                  variant="secondary" icon={Calendar}
                  onClick={() => { setModalSemResposta(null); irParaCronograma(modalSemResposta.aluno) }}>
                  Abrir cronograma
                </Button>
                {podeCobrar && (
                  <Button
                    variant="primary" icon={MessageCircle}
                    onClick={() => { const r = modalSemResposta; setModalSemResposta(null); abrirWhatsapp(r) }}>
                    Cobrar via WhatsApp
                  </Button>
                )}
              </>
            }
          >
            <div className="p-4 space-y-3">
              <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.bg} ${c.border}`}>
                <span className={`h-9 w-9 inline-flex items-center justify-center rounded-lg ${c.iconBg} ${c.iconText} shrink-0`}>
                  {StatusIcon ? <StatusIcon size={18} /> : <Clock size={18} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${c.text}`}>{s.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Esse agendamento está marcado para <span className="text-white font-mono">{fmtDateBR(modalSemResposta.data_agendada)}</span> e ainda não recebeu resposta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Tipo</p>
                  <p className="text-white font-semibold">
                    {modalSemResposta.is_training ? 'Troca de treino' : 'Feedback'}
                  </p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Telefone</p>
                  <p className={`font-mono ${aluno?.telefone ? 'text-white' : 'text-gray-600 italic'}`}>
                    {aluno?.telefone || 'não cadastrado'}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                {podeCobrar
                  ? 'Você pode cobrar o aluno via WhatsApp pra acelerar a resposta, ou abrir o cronograma pra revisar a programação.'
                  : 'Cadastre o telefone do aluno pra poder cobrar via WhatsApp. Por enquanto, você pode revisar o cronograma.'}
              </p>
            </div>
          </Modal>
        )
      })()}

      <Toast {...toast} />
    </>
  )
}

// ─── Card de pendência de planejamento ───────────────────────────────────────
function CardPendencia({ icon: Icon, label, description, value, color = 'amber', onClick }) {
  const colorMap = {
    amber:   { icon: 'text-amber-400',   iconBg: 'bg-amber-500/15',   border: 'hover:border-amber-500/40',   value: 'text-amber-400' },
    emerald: { icon: 'text-emerald-400', iconBg: 'bg-emerald-500/15', border: 'hover:border-emerald-500/40', value: 'text-emerald-400' },
    slate:   { icon: 'text-slate-300',   iconBg: 'bg-slate-500/15',   border: 'hover:border-slate-400/40',   value: 'text-slate-300' },
    blue:    { icon: 'text-blue-400',    iconBg: 'bg-blue-500/15',    border: 'hover:border-blue-500/40',    value: 'text-blue-400' },
  }
  const c = colorMap[color] || colorMap.amber
  const vazio = value === 0
  return (
    <button
      onClick={vazio ? undefined : onClick}
      disabled={vazio}
      className={`group relative bg-[#29292e] border border-[#323238] rounded-xl p-3.5 text-left transition-all
        ${vazio ? 'opacity-50 cursor-default' : `hover:bg-[#1a1a1a] ${c.border} hover:shadow-lg`}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`h-9 w-9 inline-flex items-center justify-center rounded-lg ${c.iconBg} ${c.icon} shrink-0`}>
          <Icon size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className={`text-2xl font-bold leading-none ${c.value}`}>{value}</span>
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              {value === 1 ? 'aluno' : 'alunos'}
            </span>
          </div>
          <p className="text-white text-xs font-semibold leading-tight">{label}</p>
          <p className="text-gray-500 text-[10px] mt-0.5 leading-tight">{description}</p>
        </div>
        {!vazio && (
          <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition-colors mt-1 shrink-0" />
        )}
      </div>
    </button>
  )
}

// ─── Card clicável de filtro rápido ──────────────────────────────────────────
function CardClicavel({ label, value, unit, color = 'blue', ativo = false, onClick }) {
  const colorMap = {
    blue:   { v: 'text-blue-400',   ring: 'ring-blue-500/40',   bg: 'hover:bg-blue-500/5' },
    orange: { v: 'text-orange-400', ring: 'ring-orange-500/40', bg: 'hover:bg-orange-500/5' },
    purple: { v: 'text-purple-400', ring: 'ring-purple-500/40', bg: 'hover:bg-purple-500/5' },
    red:    { v: 'text-red-400',    ring: 'ring-red-500/40',    bg: 'hover:bg-red-500/5' },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <button
      onClick={onClick}
      className={`bg-[#29292e] border border-[#323238] rounded-xl p-3 md:p-4 text-left transition-all
        ${c.bg} hover:border-[#444]
        ${ativo ? `ring-2 ${c.ring}` : ''}`}
    >
      <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl md:text-3xl font-bold leading-none ${c.v}`}>{value}</span>
        {unit && <span className="text-gray-500 text-[11px] font-medium">{unit}</span>}
      </div>
    </button>
  )
}
