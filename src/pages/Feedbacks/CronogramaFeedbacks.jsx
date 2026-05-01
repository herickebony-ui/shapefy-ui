import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  RefreshCw, Search, Palmtree, MessageSquare, Settings,
  Save, Copy, Trash2, X, ChevronLeft, ChevronRight, ArrowLeft,
  Users, Calendar as CalendarIcon, Wand2,
} from 'lucide-react'

import {
  Button, Modal, Tabs, FormGroup, Input,
  Spinner, Avatar, Autocomplete,
} from '../../components/ui'

import {
  listarAgendamentosDoAluno, sincronizarCronogramaDoAluno, clonarCronograma,
} from '../../api/cronogramaFeedbacks'
import { listarFerias, criarFerias, excluirFerias } from '../../api/ferias'
import {
  listarTemplates, criarTemplate, excluirTemplate,
  aplicarTemplate, TEMPLATE_PADRAO,
} from '../../api/templates'
import { listarAlunos, buscarAluno, salvarAluno } from '../../api/alunos'
import { listarFormulariosFeedback } from '../../api/formularios'

import {
  DEADLINE_KEY, DEFAULT_DEADLINE, TEMPLATE_LS_KEY,
  fmtDateBR, calcPlanEnd,
} from './cronograma/utils'

import Toast from './cronograma/Toast'
import MesGrid, { Legenda } from './cronograma/MesGrid'
import MarcoZeroMenu from './cronograma/MarcoZeroMenu'
import { HistoricoTabela, HistoricoTimeline } from './cronograma/HistoricoViews'
import ModalFerias from './cronograma/ModalFerias'
import ModalTemplates from './cronograma/ModalTemplates'
import ModalConfig from './cronograma/ModalConfig'
import ModalNovoDia from './cronograma/ModalNovoDia'
import ModalClonar from './cronograma/ModalClonar'
import ModalGerarSerie from './cronograma/ModalGerarSerie'

// ═════════════════════════════════════════════════════════════════════════════
export default function CronogramaFeedbacks() {
  const navigate = useNavigate()
  const { alunoId } = useParams()

  // ─── Dados base ─────────────────────────────────────────────────────────────
  const [todosAlunos, setTodosAlunos] = useState([])
  const [formularios, setFormularios] = useState([])
  const [feriasList, setFeriasList] = useState([])
  const [carregandoBase, setCarregandoBase] = useState(true)

  // ─── Aluno + cronograma ─────────────────────────────────────────────────────
  const [aluno, setAluno] = useState(null)
  const [schedule, setSchedule] = useState({ dates: [] })
  const [planForm, setPlanForm] = useState({ plan_start: '', plan_end: '', plan_duration: 6 })
  const [historicoMode, setHistoricoMode] = useState('table')
  const [salvando, setSalvando] = useState(false)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [carregandoAluno, setCarregandoAluno] = useState(false)

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const toastTimerRef = useRef(null)
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimerRef.current)
    setToast({ show: true, msg, type })
    toastTimerRef.current = setTimeout(() => setToast(s => ({ ...s, show: false })), 3000)
  }, [])

  // ─── Modais ─────────────────────────────────────────────────────────────────
  const [modalNovoDia, setModalNovoDia] = useState(null)
  const [modalClonar, setModalClonar] = useState(false)
  const [modalFerias, setModalFerias] = useState(false)
  const [modalTemplatesAberto, setModalTemplatesAberto] = useState(false)
  const [modalConfig, setModalConfig] = useState(false)
  const [modalGerarSerie, setModalGerarSerie] = useState(false)
  const [marcoZeroMenu, setMarcoZeroMenu] = useState(null)
  const [buscaClonar, setBuscaClonar] = useState('')

  // ─── Templates ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([])
  const [templateAtualId, setTemplateAtualId] = useState(
    () => localStorage.getItem(TEMPLATE_LS_KEY) || TEMPLATE_PADRAO.name,
  )
  const [templateAtualTexto, setTemplateAtualTexto] = useState(TEMPLATE_PADRAO.texto)
  const [novoTemplateNome, setNovoTemplateNome] = useState('')
  const templateTextareaRef = useRef(null)

  // ─── Form férias ────────────────────────────────────────────────────────────
  const [novaFeria, setNovaFeria] = useState({ data_inicio: '', data_fim: '', descricao: '' })
  const [salvandoFeria, setSalvandoFeria] = useState(false)

  // ─── Config prazos (localStorage) ──────────────────────────────────────────
  const [deadlineSettings, setDeadlineSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DEADLINE_KEY)) || DEFAULT_DEADLINE }
    catch { return DEFAULT_DEADLINE }
  })

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formulariosPorId = useMemo(() => {
    const m = {}
    formularios.forEach(f => { m[f.name] = f })
    return m
  }, [formularios])

  const ehTreino = useCallback((formularioId) => {
    const t = (formulariosPorId[formularioId]?.titulo || '').toLowerCase()
    return t.includes('treino') || t.includes('troca')
  }, [formulariosPorId])

  // ═════════════════════════════════════════════════════════════════════════
  // Loaders
  // ═════════════════════════════════════════════════════════════════════════
  const carregarBase = useCallback(async () => {
    setCarregandoBase(true)
    try {
      const [alunosRes, formsRes, feriasRes] = await Promise.all([
        listarAlunos({ limit: 500 }),
        listarFormulariosFeedback(),
        listarFerias(),
      ])
      setTodosAlunos(alunosRes.list || [])
      setFormularios(formsRes || [])
      setFeriasList(feriasRes || [])
    } catch (e) {
      console.error(e)
      showToast('Falha ao carregar dados', 'error')
    } finally {
      setCarregandoBase(false)
    }
  }, [showToast])

  const carregarAluno = useCallback(async (id) => {
    if (!id) {
      setAluno(null)
      setSchedule({ dates: [] })
      setPlanForm({ plan_start: '', plan_end: '', plan_duration: 6 })
      return
    }
    setCarregandoAluno(true)
    try {
      const [a, ags] = await Promise.all([
        buscarAluno(id),
        listarAgendamentosDoAluno(id),
      ])
      setAluno(a)
      const dates = (ags || []).map(ag => ({
        _name: ag.name,
        date: ag.data_agendada,
        formulario: ag.formulario,
        dias_aviso: ag.dias_aviso || 1,
        status: ag.status || 'Agendado',
        observacao: ag.observacao || '',
        nota: ag.nota || '',
        is_start: !!ag.is_start,
        respondido_em: ag.respondido_em,
      })).sort((x, y) => (x.date || '').localeCompare(y.date || ''))
      setSchedule({ dates })
      setPlanForm({
        plan_start: a.plan_start || '',
        plan_end: a.plan_end || '',
        plan_duration: a.plan_duration || 6,
      })
      setViewYear(a.plan_start
        ? new Date(a.plan_start + 'T12:00:00').getFullYear()
        : new Date().getFullYear())
    } catch (e) {
      console.error(e)
      showToast('Falha ao carregar aluno', 'error')
    } finally {
      setCarregandoAluno(false)
    }
  }, [showToast])

  useEffect(() => { carregarBase() }, [carregarBase])

  useEffect(() => { carregarAluno(alunoId) }, [alunoId, carregarAluno])

  useEffect(() => {
    localStorage.setItem(DEADLINE_KEY, JSON.stringify(deadlineSettings))
  }, [deadlineSettings])
  useEffect(() => {
    localStorage.setItem(TEMPLATE_LS_KEY, templateAtualId)
  }, [templateAtualId])

  // Carrega templates quando o modal abre
  useEffect(() => {
    if (!modalTemplatesAberto) return
    let cancel = false
    listarTemplates()
      .then(list => { if (!cancel) setTemplates(list) })
      .catch(e => { console.error(e); showToast('Falha ao carregar templates', 'error') })
    return () => { cancel = true }
  }, [modalTemplatesAberto, showToast])

  // Atualiza texto quando muda o template selecionado
  useEffect(() => {
    if (!templates.length) return
    const t = templates.find(x => x.name === templateAtualId) || templates[0]
    if (t) setTemplateAtualTexto(t.texto || '')
  }, [templateAtualId, templates])

  // ═════════════════════════════════════════════════════════════════════════
  // Stats e ciclos derivados
  // ═════════════════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const dias = schedule.dates.filter(d => !d.is_start)
    const encontros = dias.filter(d => !ehTreino(d.formulario)).length
    const trocas = dias.filter(d => ehTreino(d.formulario)).length
    let semanas = 0
    if (dias.length >= 2) {
      const sorted = [...dias].sort((a, b) => a.date.localeCompare(b.date))
      semanas = Math.round(
        (new Date(sorted[sorted.length - 1].date) - new Date(sorted[0].date))
        / (7 * 86400000),
      )
    }
    return { encontros, trocas, semanas }
  }, [schedule.dates, ehTreino])

  // CICLO: pra cada Troca, distância em semanas até a próxima Troca
  const ciclosPorData = useMemo(() => {
    const trocas = schedule.dates
      .filter(d => !d.is_start && ehTreino(d.formulario))
      .sort((a, b) => a.date.localeCompare(b.date))
    const out = {}
    for (let i = 0; i < trocas.length - 1; i++) {
      const sem = Math.round(
        (new Date(trocas[i + 1].date) - new Date(trocas[i].date)) / (7 * 86400000),
      )
      out[trocas[i].date] = sem
    }
    return out
  }, [schedule.dates, ehTreino])

  // ═════════════════════════════════════════════════════════════════════════
  // Handlers compartilhados
  // ═════════════════════════════════════════════════════════════════════════
  const irParaAluno = (id) => navigate('/cronograma-feedbacks/aluno/' + encodeURIComponent(id))
  const trocarAluno = () => navigate('/cronograma-feedbacks')

  const dataJaAgendada = (dateStr) => schedule.dates.some(d => d.date === dateStr)
  const itemDoDia = (dateStr) => schedule.dates.find(d => d.date === dateStr)

  const toggleDate = (dateStr) => {
    if (!aluno) {
      showToast('Selecione um aluno primeiro', 'info')
      return
    }
    const ja = itemDoDia(dateStr)
    if (ja) {
      setSchedule(prev => ({ dates: prev.dates.filter(d => d.date !== dateStr) }))
    } else {
      const formularioPadrao = formularios.find(f => f.enabled !== 0)?.name || formularios[0]?.name || ''
      setModalNovoDia({
        date: dateStr,
        formulario: formularioPadrao,
        dias_aviso: 1,
        is_start: false,
        nota: '',
      })
    }
  }

  const handleAdicionarNovoDia = () => {
    if (!modalNovoDia.formulario) {
      showToast('Selecione um formulário', 'error'); return
    }
    setSchedule(prev => {
      const novos = [...prev.dates, {
        date: modalNovoDia.date,
        formulario: modalNovoDia.formulario,
        dias_aviso: Number(modalNovoDia.dias_aviso) || 1,
        status: 'Agendado',
        is_start: !!modalNovoDia.is_start,
        nota: modalNovoDia.nota || '',
        observacao: '',
      }]
      novos.sort((a, b) => a.date.localeCompare(b.date))
      return { dates: novos }
    })
    setModalNovoDia(null)
  }

  const handleSetMarcoZero = (dateStr, novoValor) => {
    setSchedule(prev => ({
      dates: prev.dates.map(d => d.date === dateStr ? { ...d, is_start: novoValor } : d),
    }))
    setMarcoZeroMenu(null)
  }

  const handleTrocarFormulario = (dateStr, formularioId) => {
    setSchedule(prev => ({
      dates: prev.dates.map(d => d.date === dateStr ? { ...d, formulario: formularioId } : d),
    }))
  }

  const handleRemoverDataLocal = (dateStr) => {
    setSchedule(prev => ({ dates: prev.dates.filter(d => d.date !== dateStr) }))
  }

  const handlePlanFormChange = (campo, valor) => {
    setPlanForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'plan_start' || campo === 'plan_duration') {
        next.plan_end = calcPlanEnd(next.plan_start, next.plan_duration)
      }
      return next
    })
  }

  const handleSalvar = async () => {
    if (!alunoId) return
    setSalvando(true)
    try {
      await salvarAluno(alunoId, {
        plan_start: planForm.plan_start || null,
        plan_end: planForm.plan_end || null,
        plan_duration: Number(planForm.plan_duration) || 0,
      })
      await sincronizarCronogramaDoAluno(alunoId, schedule.dates.map(d => ({
        formulario: d.formulario,
        data_agendada: d.date,
        dias_aviso: Number(d.dias_aviso) || 1,
        status: d.status || 'Agendado',
        observacao: d.observacao || '',
        nota: d.nota || '',
        is_start: d.is_start ? 1 : 0,
      })))
      showToast('Cronograma salvo!', 'success')
      await carregarAluno(alunoId)
    } catch (e) {
      console.error(e)
      showToast('Falha ao salvar cronograma', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleLimparCronograma = () => {
    if (!window.confirm('Remover todas as datas (mantém vigência)?')) return
    setSchedule({ dates: [] })
    showToast('Datas limpas (clique Salvar pra persistir)', 'info')
  }

  const handleGerarSerie = (datas) => {
    const existentes = new Set(schedule.dates.map(d => d.date))
    const novas = datas.filter(d => !existentes.has(d.date))
    const ignoradas = datas.length - novas.length
    setSchedule(prev => ({
      dates: [...prev.dates, ...novas].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    setModalGerarSerie(false)
    const msg = ignoradas > 0
      ? `${novas.length} datas geradas · ${ignoradas} já existiam`
      : `${novas.length} datas geradas`
    showToast(msg + ' (clique Salvar pra persistir)', 'success')
  }

  const handleClonar = async (origemId) => {
    if (!alunoId || origemId === alunoId) return
    if (!window.confirm('Clonar o cronograma do aluno selecionado pra este aluno? Pode duplicar datas existentes.')) return
    setSalvando(true)
    try {
      await clonarCronograma(origemId, alunoId)
      await carregarAluno(alunoId)
      setModalClonar(false)
      setBuscaClonar('')
      showToast('Cronograma clonado', 'success')
    } catch (e) {
      console.error(e)
      showToast(e.message || 'Falha ao clonar', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const handleCopiarMensagem = async () => {
    const tplObj = templates.find(t => t.name === templateAtualId)
    const tpl = tplObj?.texto
            || (templateAtualId === TEMPLATE_PADRAO.name ? TEMPLATE_PADRAO.texto : templateAtualTexto)
    const datasNotMarco = schedule.dates
      .filter(d => !d.is_start)
      .map(d => fmtDateBR(d.date))
      .join('\n')
    const txt = aplicarTemplate(tpl, {
      nome: aluno?.nome_completo || '',
      fim_plano: planForm.plan_end ? fmtDateBR(planForm.plan_end) : '',
      lista_datas: datasNotMarco,
      senha_acesso: aluno?.senha_de_acesso || '(não cadastrada)',
    })
    try {
      await navigator.clipboard.writeText(txt)
      showToast('Mensagem copiada', 'success')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = txt; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
      showToast('Mensagem copiada', 'success')
    }
  }

  // ─── Férias ─────────────────────────────────────────────────────────────────
  const handleAdicionarFerias = async () => {
    if (!novaFeria.data_inicio || !novaFeria.data_fim) {
      showToast('Informe início e fim', 'error'); return
    }
    if (novaFeria.data_fim < novaFeria.data_inicio) {
      showToast('Fim deve ser após o início', 'error'); return
    }
    setSalvandoFeria(true)
    try {
      await criarFerias(novaFeria)
      const nova = await listarFerias()
      setFeriasList(nova)
      setNovaFeria({ data_inicio: '', data_fim: '', descricao: '' })
      showToast('Período adicionado', 'success')
    } catch (e) {
      console.error(e)
      showToast('Falha ao adicionar período', 'error')
    } finally {
      setSalvandoFeria(false)
    }
  }

  const handleRemoverFerias = async (id) => {
    if (!window.confirm('Remover este período de férias?')) return
    try {
      await excluirFerias(id)
      setFeriasList(prev => prev.filter(f => f.name !== id))
      showToast('Período removido', 'success')
    } catch (e) {
      console.error(e)
      showToast('Falha ao remover', 'error')
    }
  }

  // ─── Templates ──────────────────────────────────────────────────────────────
  const handleSalvarNovoTemplate = async () => {
    if (!novoTemplateNome.trim()) { showToast('Informe um nome', 'error'); return }
    try {
      const novo = await criarTemplate({ nome: novoTemplateNome.trim(), texto: templateAtualTexto })
      const lista = await listarTemplates()
      setTemplates(lista)
      setTemplateAtualId(novo.name)
      setNovoTemplateNome('')
      showToast('Template salvo', 'success')
    } catch (e) {
      console.error(e)
      showToast('Falha ao salvar template', 'error')
    }
  }

  const handleExcluirTemplate = async (id) => {
    if (id === TEMPLATE_PADRAO.name) {
      showToast('Não é possível excluir o Modelo Padrão', 'error'); return
    }
    if (!window.confirm('Excluir este template?')) return
    try {
      await excluirTemplate(id)
      const lista = await listarTemplates()
      setTemplates(lista)
      if (templateAtualId === id) setTemplateAtualId(TEMPLATE_PADRAO.name)
      showToast('Template excluído', 'success')
    } catch (e) {
      console.error(e)
      showToast('Falha ao excluir', 'error')
    }
  }

  const aplicarFormatoTexto = (wrapStart, wrapEnd) => {
    const ta = templateTextareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = templateAtualTexto.slice(start, end) || 'texto'
    const novo = templateAtualTexto.slice(0, start) + wrapStart + sel + wrapEnd + templateAtualTexto.slice(end)
    setTemplateAtualTexto(novo)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + wrapStart.length, start + wrapStart.length + sel.length)
    }, 0)
  }

  // ─── Busca de aluno (autocomplete) ──────────────────────────────────────────
  const searchAluno = useCallback(async (q) => {
    const lower = (q || '').toLowerCase().trim()
    if (!lower) return todosAlunos.slice(0, 20)
    return todosAlunos
      .filter(a => (a.nome_completo || '').toLowerCase().includes(lower))
      .slice(0, 30)
  }, [todosAlunos])

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  if (carregandoBase) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gestão de Ciclos</p>
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">Cronograma de Feedbacks</h1>
          <p className="text-gray-500 text-xs mt-1">Planejamento e retenção</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Palmtree}
                  onClick={() => setModalFerias(true)}>
            <span className="hidden md:inline">Férias</span>
          </Button>
          <Button variant="secondary" size="sm" icon={MessageSquare}
                  onClick={() => setModalTemplatesAberto(true)}>
            <span className="hidden md:inline">Templates</span>
          </Button>
          <Button variant="secondary" size="sm" icon={Settings}
                  onClick={() => setModalConfig(true)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Coluna esquerda ─────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Selecionar Aluno */}
          <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Selecionar Aluno</h3>
            {!aluno ? (
              <Autocomplete
                searchFn={searchAluno}
                onSelect={(a) => irParaAluno(a.name)}
                renderItem={(a) => (
                  <div className="flex items-center gap-2">
                    <Avatar nome={a.nome_completo} size="xs" />
                    <span className="truncate">{a.nome_completo}</span>
                  </div>
                )}
                placeholder="Digite o nome do aluno..."
                icon={Search}
              />
            ) : (
              <div className="flex items-center gap-3 p-2 bg-[#1a1a1a] border border-[#323238] rounded-lg">
                <Avatar nome={aluno.nome_completo} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{aluno.nome_completo}</p>
                  {aluno.email && <p className="text-gray-500 text-[11px] truncate">{aluno.email}</p>}
                </div>
                <button onClick={trocarAluno}
                  title="Trocar aluno"
                  className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors">
                  <ArrowLeft size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Encontros', value: stats.encontros },
              { label: 'Trocas',    value: stats.trocas },
              { label: 'Semanas',   value: stats.semanas },
            ].map(s => (
              <div key={s.label} className="bg-[#29292e] border border-[#323238] rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Vigência */}
          <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Vigência do Plano</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormGroup label="Início">
                <Input type="date" value={planForm.plan_start} disabled={!aluno}
                  onChange={(v) => handlePlanFormChange('plan_start', v)} />
              </FormGroup>
              <FormGroup label="Duração (meses)">
                <Input type="number" value={String(planForm.plan_duration)} disabled={!aluno}
                  onChange={(v) => handlePlanFormChange('plan_duration', Number(v) || 0)} />
              </FormGroup>
            </div>
            <FormGroup label="Fim (auto)" hint="Início + duração">
              <Input type="date" value={planForm.plan_end} onChange={() => {}} disabled />
            </FormGroup>
          </div>

          {/* Cronograma */}
          <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">
            <div className="px-3 py-3 border-b border-[#323238] flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Copy}
                  onClick={handleCopiarMensagem} disabled={!aluno}>Copiar</Button>
                <Button variant="primary" size="sm" icon={Save}
                  onClick={handleSalvar} loading={salvando}
                  disabled={!aluno} fullWidth>
                  Salvar Alterações
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" size="xs" icon={Wand2}
                  onClick={() => setModalGerarSerie(true)} disabled={!aluno}>Gerar série</Button>
                <Button variant="ghost" size="xs" icon={MessageSquare}
                  onClick={() => setModalTemplatesAberto(true)}>Template</Button>
                <Button variant="ghost" size="xs" icon={Trash2}
                  onClick={handleLimparCronograma} disabled={!aluno}>Limpar</Button>
                <Button variant="ghost" size="xs" icon={Users}
                  onClick={() => setModalClonar(true)} disabled={!aluno}>Clonar</Button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {!aluno ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 text-xs">Selecione um aluno acima.</p>
                </div>
              ) : schedule.dates.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 text-xs">Nenhuma data ainda. Clique no calendário ao lado.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#1a1a1a] border-b border-[#323238]">
                      <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-gray-500">Data</th>
                      <th className="px-2 py-2 font-bold uppercase tracking-wider text-[10px] text-gray-500">Tipo</th>
                      <th className="px-2 py-2 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center">Int.</th>
                      <th className="px-2 py-2 font-bold uppercase tracking-wider text-[10px] text-gray-500 text-center">Ciclo</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.dates.map((d, i) => {
                      const prev = schedule.dates[i - 1]
                      const intervalo = prev
                        ? Math.round((new Date(d.date) - new Date(prev.date)) / (7 * 86400000))
                        : 0
                      const isTr = ehTreino(d.formulario)
                      const ciclo = isTr ? ciclosPorData[d.date] : null
                      return (
                        <tr key={d.date}
                          className={`border-b border-[#323238]/40 ${
                            d.is_start ? 'bg-[#2563eb]/15' : i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'
                          }`}>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-medium">{fmtDateBR(d.date)}</span>
                              {d.is_start && (
                                <span className="text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded bg-[#2563eb]/20 text-blue-300 border border-[#2563eb]/40">
                                  Início
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={d.formulario}
                              onChange={(e) => handleTrocarFormulario(d.date, e.target.value)}
                              title="Trocar formulário"
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border outline-none cursor-pointer appearance-none max-w-[140px] truncate ${
                                isTr
                                  ? 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
                                  : 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                              }`}>
                              {formularios.map(f => (
                                <option key={f.name} value={f.name} className="bg-[#1a1a1a] text-white">
                                  {f.titulo}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-500">
                            {intervalo > 0 ? `${intervalo}x` : '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {ciclo
                              ? <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">{ciclo} sem</span>
                              : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => handleRemoverDataLocal(d.date)}
                              title="Remover"
                              className="h-6 w-6 inline-flex items-center justify-center text-gray-500 hover:text-red-400">
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {aluno && schedule.dates.length > 0 && (
              <div className="px-3 py-3 border-t border-[#323238] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Planejado</span>
                <span className="text-sm font-bold text-white">{stats.semanas} semanas</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Coluna direita ──────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Histórico */}
          {aluno && (
            <div className="bg-[#29292e] border border-[#323238] rounded-xl">
              <div className="px-4 py-3 border-b border-[#323238] flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight">Histórico</h3>
                <Tabs
                  variant="pills"
                  active={historicoMode}
                  onChange={setHistoricoMode}
                  tabs={[
                    { id: 'table',    label: 'Tabela' },
                    { id: 'timeline', label: 'Timeline' },
                  ]}
                />
              </div>
              <div className="p-4">
                {historicoMode === 'table'
                  ? <HistoricoTabela schedule={schedule} ehTreino={ehTreino} />
                  : <HistoricoTimeline schedule={schedule} ehTreino={ehTreino} />}
              </div>
            </div>
          )}

          {/* Calendário Anual */}
          <div className="bg-[#29292e] border border-[#323238] rounded-xl">
            <div className="px-4 py-3 border-b border-[#323238] flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <CalendarIcon size={14} className="text-gray-400" />
                Calendário Anual
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewYear(y => y - 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#323238] text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-bold tracking-tight px-3">{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#323238] text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {carregandoAluno ? (
              <div className="p-12 flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, m) => (
                  <MesGrid
                    key={m}
                    year={viewYear}
                    month={m}
                    schedule={schedule}
                    feriasList={feriasList}
                    planStart={planForm.plan_start}
                    planEnd={planForm.plan_end}
                    ehTreino={ehTreino}
                    onClickDate={toggleDate}
                    onContextDate={(e, dateStr) => {
                      if (!dataJaAgendada(dateStr)) return
                      e.preventDefault()
                      setMarcoZeroMenu({ date: dateStr, x: e.clientX, y: e.clientY })
                    }}
                  />
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-[#323238] flex flex-wrap gap-3 text-[10px] text-gray-500">
              <Legenda cor="bg-[#2563eb]" label="Feedback" />
              <Legenda cor="bg-purple-500" label="Treino/Troca" />
              <Legenda cor="bg-emerald-700" label="Segunda na vigência" />
              <Legenda cor="bg-green-900/40 border border-green-700/40" label="Dentro da vigência" />
              <Legenda cor="bg-[#1a1a1a] border border-blue-500/40" label="Férias" />
              <Legenda label="Marco Zero (clique direito)" />
              <Legenda cor="bg-orange-400" label="Feriado" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modais ───────────────────────────────────────────────────── */}
      {modalNovoDia && (
        <ModalNovoDia
          draft={modalNovoDia}
          formularios={formularios}
          setDraft={setModalNovoDia}
          onAdicionar={handleAdicionarNovoDia}
          onClose={() => setModalNovoDia(null)}
        />
      )}

      {modalGerarSerie && (
        <ModalGerarSerie
          formularios={formularios}
          planEnd={planForm.plan_end}
          feriasList={feriasList}
          onGerar={handleGerarSerie}
          onClose={() => setModalGerarSerie(false)}
        />
      )}

      {modalClonar && (
        <ModalClonar
          alunos={todosAlunos}
          alunoIdAtual={alunoId}
          busca={buscaClonar}
          setBusca={setBuscaClonar}
          onSelecionar={handleClonar}
          onClose={() => { setModalClonar(false); setBuscaClonar('') }}
        />
      )}

      {modalFerias && (
        <ModalFerias
          ferias={feriasList}
          novaFeria={novaFeria}
          setNovaFeria={setNovaFeria}
          salvando={salvandoFeria}
          onAdicionar={handleAdicionarFerias}
          onRemover={handleRemoverFerias}
          onClose={() => setModalFerias(false)}
        />
      )}

      {modalTemplatesAberto && (
        <ModalTemplates
          templates={templates}
          templateAtualId={templateAtualId}
          setTemplateAtualId={setTemplateAtualId}
          templateAtualTexto={templateAtualTexto}
          setTemplateAtualTexto={setTemplateAtualTexto}
          novoTemplateNome={novoTemplateNome}
          setNovoTemplateNome={setNovoTemplateNome}
          templateTextareaRef={templateTextareaRef}
          onSalvarNovo={handleSalvarNovoTemplate}
          onExcluir={handleExcluirTemplate}
          onAplicarFormato={aplicarFormatoTexto}
          onClose={() => setModalTemplatesAberto(false)}
        />
      )}

      {modalConfig && (
        <ModalConfig
          deadlineSettings={deadlineSettings}
          setDeadlineSettings={setDeadlineSettings}
          onClose={() => setModalConfig(false)}
        />
      )}

      {marcoZeroMenu && (
        <MarcoZeroMenu
          menu={marcoZeroMenu}
          itemAtual={itemDoDia(marcoZeroMenu.date)}
          onClose={() => setMarcoZeroMenu(null)}
          onSet={(novoVal) => handleSetMarcoZero(marcoZeroMenu.date, novoVal)}
        />
      )}

      <Toast {...toast} />
    </div>
  )
}
