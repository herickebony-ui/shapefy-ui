import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, ChevronLeft, ChevronRight, Calendar, MessageCircle,
  Eye, Search, AlertCircle, Clock, Check, UserPlus, Send,
} from 'lucide-react'

import {
  Button, Badge, Avatar, DataTable, EmptyState,
  Modal, FormGroup, Select, Textarea,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

import { listarAgendamentos } from '../../api/cronogramaFeedbacks'
import { listarAlunos } from '../../api/alunos'
import { listarTemplates, aplicarTemplate, TEMPLATE_PADRAO } from '../../api/templates'

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
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  // ─── Filtros ────────────────────────────────────────────────────────────────
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('esta_semana')
  const [filtroTipo, setFiltroTipo] = useState('') // '', 'feedback', 'troca'
  const [semanaOffset, setSemanaOffset] = useState(0)

  // ─── Modais ─────────────────────────────────────────────────────────────────
  const [modalCobranca, setModalCobranca] = useState(null)
  const [templateAtualId, setTemplateAtualId] = useState(TEMPLATE_PADRAO.name)
  const [mensagemEditada, setMensagemEditada] = useState('')

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

  const carregarTemplates = useCallback(async () => {
    try {
      const list = await listarTemplates()
      setTemplates(list)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { carregarTemplates() }, [carregarTemplates])

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

  const abrirCobranca = (item) => {
    const aluno = alunosPorId[item.aluno]
    if (!aluno?.telefone) {
      showToast('Aluno sem telefone cadastrado', 'error')
      return
    }
    const tplObj = templates.find(t => t.name === templateAtualId) || templates[0] || TEMPLATE_PADRAO
    const mensagem = aplicarTemplate(tplObj.texto || TEMPLATE_PADRAO.texto, {
      nome: aluno.nome_completo || '',
      fim_plano: aluno.plan_end ? fmtDateBR(aluno.plan_end) : '',
      lista_datas: '',
      senha_acesso: aluno.senha_de_acesso || '(não cadastrada)',
    })
    setMensagemEditada(mensagem)
    setModalCobranca(item)
  }

  const handleEnviarWhatsapp = () => {
    const aluno = alunosPorId[modalCobranca?.aluno]
    if (!aluno?.telefone) return
    const tel = String(aluno.telefone).replace(/\D/g, '')
    const numero = tel.startsWith('55') ? tel : `55${tel}`
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemEditada)}`
    window.open(url, '_blank')
    setModalCobranca(null)
  }

  const handleTrocarTemplate = (id) => {
    setTemplateAtualId(id)
    const tpl = templates.find(t => t.name === id) || TEMPLATE_PADRAO
    const aluno = alunosPorId[modalCobranca?.aluno]
    if (!aluno) return
    const mensagem = aplicarTemplate(tpl.texto || TEMPLATE_PADRAO.texto, {
      nome: aluno.nome_completo || '',
      fim_plano: aluno.plan_end ? fmtDateBR(aluno.plan_end) : '',
      lista_datas: '',
      senha_acesso: aluno.senha_de_acesso || '(não cadastrada)',
    })
    setMensagemEditada(mensagem)
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Colunas da tabela
  // ═════════════════════════════════════════════════════════════════════════
  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); irParaCronograma(row.aluno) }}
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
                onClick={() => abrirCobranca(row)}
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
            <Button variant="primary" onClick={() => navigate('/alunos')}>
              Ir para alunos
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

      {/* Modal de cobrança */}
      {modalCobranca && (
        <Modal
          isOpen
          onClose={() => setModalCobranca(null)}
          title="Cobrar feedback"
          subtitle={modalCobranca._alunoNome}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalCobranca(null)}>Cancelar</Button>
              <Button variant="primary" icon={Send} onClick={handleEnviarWhatsapp}
                disabled={!modalCobranca._alunoTelefone}>
                Abrir WhatsApp
              </Button>
            </>
          }
        >
          <div className="p-4 space-y-3">
            <FormGroup label="Template">
              <Select
                value={templateAtualId}
                onChange={handleTrocarTemplate}
                options={templates.map(t => ({ value: t.name, label: t.nome }))}
              />
            </FormGroup>

            <FormGroup label="Mensagem" hint="Edite à vontade antes de enviar">
              <Textarea
                value={mensagemEditada}
                onChange={setMensagemEditada}
                rows={10}
              />
            </FormGroup>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Telefone: <span className="text-white font-mono">
                  {modalCobranca._alunoTelefone || '— não cadastrado'}
                </span>
              </span>
              {modalCobranca.data_agendada && (
                <span className="text-gray-500">
                  Agendado para {fmtDateBR(modalCobranca.data_agendada)}
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Toast {...toast} />
    </>
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
