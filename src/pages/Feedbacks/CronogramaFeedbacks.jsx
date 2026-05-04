import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Palmtree, MessageSquare,
  Save, Copy, Trash2, X, ChevronLeft, ChevronRight, ArrowLeft,
  Users, Calendar as CalendarIcon, Wand2, MoreVertical, Plus,
} from 'lucide-react'

import {
  Button, Modal, Tabs, FormGroup, Input,
  Spinner, Avatar, Autocomplete,
} from '../../components/ui'

import {
  listarAgendamentosDoAluno, sincronizarCronogramaDoAluno,
  clonarCronograma, salvarAgendamento, obterStatusCronogramaAlunos,
} from '../../api/cronogramaFeedbacks'

const LS_ULTIMO_ALUNO = 'shapefy-cronograma-ultimo-aluno'
import { listarFerias, criarFerias, excluirFerias } from '../../api/ferias'
import {
  listarTemplates, criarTemplate, excluirTemplate,
  aplicarTemplate, TEMPLATE_PADRAO,
} from '../../api/templates'
import { listarAlunos, buscarAluno, salvarAluno } from '../../api/alunos'
import { listarFormulariosFeedback } from '../../api/formularios'
import { listarContratos } from '../../api/contratosAluno'

import {
  TEMPLATE_LS_KEY,
  fmtDateBR, calcPlanEnd,
} from './cronograma/utils'

import Toast from './cronograma/Toast'
import MesGrid, { Legenda } from './cronograma/MesGrid'
import MarcoZeroMenu from './cronograma/MarcoZeroMenu'
import { HistoricoTabela, HistoricoTimeline } from './cronograma/HistoricoViews'
import ModalFerias from './cronograma/ModalFerias'
import ModalTemplates from './cronograma/ModalTemplates'
import ModalNovoDia from './cronograma/ModalNovoDia'
import ModalClonar from './cronograma/ModalClonar'
import ModalGerarSerie from './cronograma/ModalGerarSerie'
import TipoBotao from './cronograma/TipoBotao'
import { agruparPorCiclo } from './cronograma/serie'
import { todayISO } from './cronograma/utils'
import HubAlunosCronograma from './cronograma/HubAlunosCronograma'

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
  const [contratoRelevante, setContratoRelevante] = useState(null)
  const [schedule, setSchedule] = useState({ dates: [] })
  const [planForm, setPlanForm] = useState({
    plan_start: '', plan_end: '', plan_duration: 6, formulario_padrao: '',
  })
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
  const [modalGerarSerie, setModalGerarSerie] = useState(false)
  const [marcoZeroMenu, setMarcoZeroMenu] = useState(null)
  const [maisMenuAberto, setMaisMenuAberto] = useState(false)
  const maisMenuRef = useRef(null)
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
      setContratoRelevante(null)
      setSchedule({ dates: [] })
      setPlanForm({ plan_start: '', plan_end: '', plan_duration: 6, formulario_padrao: '' })
      return
    }
    setCarregandoAluno(true)
    try {
      const [a, ags, contratosRes] = await Promise.all([
        buscarAluno(id),
        listarAgendamentosDoAluno(id),
        // Busca contratos do aluno pra linkar com Financeiro (vigência + pago-e-não-iniciado)
        listarContratos({ aluno: id, limit: 20 }).catch(() => ({ list: [] })),
      ])
      setAluno(a)
      // Escolhe contrato relevante: prioriza vigente; depois pago-e-não-iniciado;
      // depois o mais recente por data_fim
      const hojeISO = new Date().toISOString().slice(0, 10)
      const cs = (contratosRes?.list || []).filter(c => c.status_manual !== 'Pausado')
      const vigente = cs.find(c => {
        const ini = (c.data_inicio || '').slice(0, 10)
        const fim = (c.data_fim || '').slice(0, 10)
        return ini && fim && ini <= hojeISO && hojeISO <= fim
      })
      const pagoNaoIniciado = !vigente && cs.find(c =>
        !c.data_inicio && c.data_pagamento_principal,
      )
      const maisRecente = !vigente && !pagoNaoIniciado && [...cs].sort((a, b) =>
        (b.data_fim || '').localeCompare(a.data_fim || ''),
      )[0]
      const contrato = vigente || pagoNaoIniciado || maisRecente || null
      setContratoRelevante(contrato)
      const dates = (ags || []).map(ag => ({
        _name: ag.name,
        date: ag.data_agendada,
        formulario: ag.formulario,
        dias_aviso: ag.dias_aviso || 1,
        status: ag.status || 'Agendado',
        observacao: ag.observacao || '',
        nota: ag.nota || '',
        is_start: !!ag.is_start,
        is_training: !!ag.is_training,
        respondido_em: ag.respondido_em,
      })).sort((x, y) => (x.date || '').localeCompare(y.date || ''))
      setSchedule({ dates })
      // Vigência: contrato é fonte de verdade. Se há contrato relevante com
      // data_inicio definida, sobrescreve o espelho do aluno (que pode estar
      // desatualizado). Caso contrário, usa o espelho.
      const usarContrato = contrato?.data_inicio && contrato?.data_fim
      const planStart = usarContrato ? contrato.data_inicio.slice(0, 10) : (a.plan_start || '')
      const planEnd = usarContrato ? contrato.data_fim.slice(0, 10) : (a.plan_end || '')
      const planDuration = usarContrato
        ? (contrato.variacao_duracao_meses || a.plan_duration || 6)
        : (a.plan_duration || 6)
      setPlanForm({
        plan_start: planStart,
        plan_end: planEnd,
        plan_duration: planDuration,
        formulario_padrao: a.formulario_padrao || '',
      })
      setViewYear(planStart
        ? new Date(planStart + 'T12:00:00').getFullYear()
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

  // Salva o último aluno carregado, pra abrir nele direto da próxima vez
  useEffect(() => {
    if (aluno?.name) localStorage.setItem(LS_ULTIMO_ALUNO, aluno.name)
  }, [aluno?.name])

  // Entrou em /cronograma-feedbacks sem aluno → tenta abrir o último ou o
  // primeiro com cronograma. Fallback: deixa o hub de busca aparecer.
  useEffect(() => {
    if (alunoId) return
    if (carregandoBase) return
    let cancel = false
    ;(async () => {
      const ultimo = localStorage.getItem(LS_ULTIMO_ALUNO)
      if (ultimo) {
        navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(ultimo)}`, { replace: true })
        return
      }
      try {
        const res = await listarAlunos({ limit: 30 })
        if (cancel) return
        const lista = res.list || []
        if (!lista.length) return
        const ids = lista.map(a => a.name)
        const stat = await obterStatusCronogramaAlunos(ids).catch(() => ({}))
        if (cancel) return
        const primeiro = lista.find(a => (stat?.[a.name]?.total || 0) > 0)
        if (primeiro) {
          navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(primeiro.name)}`, { replace: true })
        }
      } catch (e) { console.error(e) }
    })()
    return () => { cancel = true }
  }, [alunoId, carregandoBase, navigate])

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

  // Fecha menu "Mais" ao clicar fora
  useEffect(() => {
    if (!maisMenuAberto) return
    const onClick = (e) => {
      if (maisMenuRef.current && !maisMenuRef.current.contains(e.target)) {
        setMaisMenuAberto(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [maisMenuAberto])

  // ═════════════════════════════════════════════════════════════════════════
  // Stats e ciclos derivados
  // ═════════════════════════════════════════════════════════════════════════
  // Stats — calculados a partir do ÚLTIMO Marco Zero. Tudo antes vira
  // histórico passivo (renovação preserva). Se não tem nenhum Marco Zero,
  // considera todas as datas.
  const stats = useMemo(() => {
    const sorted = [...schedule.dates].sort((a, b) => a.date.localeCompare(b.date))
    let inicioIdx = -1
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].is_start) { inicioIdx = i; break }
    }
    const cicloAtual = inicioIdx >= 0 ? sorted.slice(inicioIdx) : sorted
    const dias = cicloAtual.filter(d => !d.is_start)
    const trocas = dias.filter(d => d.is_training).length
    const encontros = dias.length
    let semanas = 0
    if (cicloAtual.length >= 2) {
      semanas = Math.round(
        (new Date(cicloAtual[cicloAtual.length - 1].date) - new Date(cicloAtual[0].date))
        / (7 * 86400000),
      ) + 1 // inclusivo
    }
    return {
      encontros,
      trocas,
      semanas,
      historicoCount: inicioIdx >= 0 ? inicioIdx : 0,
    }
  }, [schedule.dates])

  // CICLOS: cada grupo é uma ficha (Marco Zero ou Troca encerra). Helper retorna
  // [{ label: '4 semanas' | 'Ciclo a definir', items: [...dates] }].
  const grupos = useMemo(() => agruparPorCiclo(schedule.dates), [schedule.dates])

  // Formulários compatíveis com o plano da aluna (dieta/treino)
  const formulariosCompativeis = useMemo(() => {
    if (!aluno || (aluno.dieta == null && aluno.treino == null)) return formularios
    const aDieta = !!aluno.dieta
    const aTreino = !!aluno.treino
    const matches = formularios.filter(f => !!f.dieta === aDieta && !!f.treino === aTreino)
    return matches.length ? matches : formularios
  }, [aluno, formularios])

  // Formulário a ser usado por padrão ao criar/preencher datas:
  // 1. formulario_padrao do aluno se ele estiver nos compatíveis
  // 2. primeiro compatível (match exato dieta/treino)
  // 3. primeiro disponível
  const formularioSugerido = useMemo(() => {
    if (planForm.formulario_padrao && formulariosCompativeis.some(f => f.name === planForm.formulario_padrao)) {
      return planForm.formulario_padrao
    }
    return formulariosCompativeis[0]?.name || formularios[0]?.name || ''
  }, [planForm.formulario_padrao, formulariosCompativeis, formularios])

  const handleSetFormulario = useCallback(async (date, formId) => {
    const atual = schedule.dates.find(d => d.date === date)
    if (!atual) return
    setSchedule(prev => ({
      dates: prev.dates.map(d => d.date === date ? { ...d, formulario: formId } : d),
    }))
    if (atual._name) {
      try {
        await salvarAgendamento(atual._name, { formulario: formId })
      } catch (e) {
        console.error(e)
        showToast('Falha ao salvar formulário', 'error')
        // reverte
        setSchedule(prev => ({
          dates: prev.dates.map(d => d.date === date ? { ...d, formulario: atual.formulario } : d),
        }))
      }
    }
  }, [schedule.dates, showToast])

  // ═════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═════════════════════════════════════════════════════════════════════════
  const irParaAluno = (id) => navigate('/cronograma-feedbacks/aluno/' + encodeURIComponent(id))
  const trocarAluno = () => navigate('/painel-feedbacks')

  const dataJaAgendada = (dateStr) => schedule.dates.some(d => d.date === dateStr)
  const itemDoDia = (dateStr) => schedule.dates.find(d => d.date === dateStr)

  // Click esquerdo no calendário: TOGGLE.
  // Se a data já tem feedback, remove. Se não, adiciona com defaults.
  // Marco Zero e edição detalhada via clique direito (MarcoZeroMenu).
  const onClickDate = (dateStr) => {
    if (!aluno) {
      showToast('Selecione um aluno primeiro', 'info')
      return
    }
    if (dataJaAgendada(dateStr)) {
      // Toggle remove
      setSchedule(prev => ({ dates: prev.dates.filter(d => d.date !== dateStr) }))
      showToast(`${fmtDateBR(dateStr)} removido`, 'info')
      return
    }
    if (!formularioSugerido) {
      showToast('Cadastre um Formulário de Feedback antes', 'error')
      return
    }
    setSchedule(prev => {
      const novos = [...prev.dates, {
        date: dateStr,
        formulario: formularioSugerido,
        dias_aviso: 1,
        status: 'Agendado',
        is_start: false,
        is_training: false,
        nota: '',
        observacao: '',
      }]
      novos.sort((a, b) => a.date.localeCompare(b.date))
      return { dates: novos }
    })
    showToast(`${fmtDateBR(dateStr)} adicionado · clique direito pra detalhes`, 'success')
  }

  const handleAdicionarNovoDia = () => {
    if (!modalNovoDia.formulario) {
      showToast('Selecione um formulário', 'error'); return
    }
    if (modalNovoDia._editando) {
      // Modo edição: atualiza a linha existente
      setSchedule(prev => ({
        dates: prev.dates.map(d => d.date === modalNovoDia.date
          ? {
              ...d,
              formulario: modalNovoDia.formulario,
              dias_aviso: Number(modalNovoDia.dias_aviso) || 1,
              is_start: !!modalNovoDia.is_start,
              nota: modalNovoDia.nota || '',
            }
          : d,
        ),
      }))
    } else {
      setSchedule(prev => {
        const novos = [...prev.dates, {
          date: modalNovoDia.date,
          formulario: modalNovoDia.formulario,
          dias_aviso: Number(modalNovoDia.dias_aviso) || 1,
          status: 'Agendado',
          is_start: !!modalNovoDia.is_start,
          is_training: false,
          nota: modalNovoDia.nota || '',
          observacao: '',
        }]
        novos.sort((a, b) => a.date.localeCompare(b.date))
        return { dates: novos }
      })
    }
    setModalNovoDia(null)
  }

  const handleSetMarcoZero = (dateStr, novoValor) => {
    setSchedule(prev => ({
      dates: prev.dates.map(d => d.date === dateStr ? { ...d, is_start: novoValor } : d),
    }))
    setMarcoZeroMenu(null)
  }

  const handleToggleTraining = async (dateStr, novoVal) => {
    const atual = schedule.dates.find(d => d.date === dateStr)
    if (!atual) return
    // Atualização otimista
    setSchedule(prev => ({
      dates: prev.dates.map(d => d.date === dateStr ? { ...d, is_training: novoVal } : d),
    }))
    if (atual._name) {
      try {
        await salvarAgendamento(atual._name, { is_training: novoVal })
        showToast(novoVal ? 'Marcado como Troca' : 'Marcado como Feedback', 'success')
      } catch (e) {
        console.error(e)
        showToast('Falha ao salvar', 'error')
        // Reverte
        setSchedule(prev => ({
          dates: prev.dates.map(d => d.date === dateStr ? { ...d, is_training: !novoVal } : d),
        }))
      }
    }
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
        formulario_padrao: planForm.formulario_padrao || formularioSugerido || null,
      })
      await sincronizarCronogramaDoAluno(alunoId, schedule.dates.map(d => ({
        formulario: d.formulario || planForm.formulario_padrao,
        data_agendada: d.date,
        dias_aviso: Number(d.dias_aviso) || 1,
        status: d.status || 'Agendado',
        observacao: d.observacao || '',
        nota: d.nota || '',
        is_start: d.is_start ? 1 : 0,
        is_training: d.is_training ? 1 : 0,
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
    setMaisMenuAberto(false)
    showToast('Datas limpas (clique Salvar pra persistir)', 'info')
  }

  // Renovação preservando histórico: zera vigência mas mantém todas as datas.
  // Profissional define o novo Marco Zero via botão direito numa data futura.
  const handleRenovarCiclo = () => {
    if (!window.confirm(
      'Renovar ciclo?\n\n• Histórico de datas preservado (nada apagado)\n'
      + '• Vigência será zerada\n'
      + '• Defina o novo Marco Zero clicando com botão direito numa data\n'
      + '• Stats passam a contar a partir do novo Marco Zero',
    )) return
    setPlanForm(prev => ({ ...prev, plan_start: '', plan_end: '', plan_duration: 3 }))
    // Tira o is_start de todos pra forçar redefinição manual
    setSchedule(prev => ({ dates: prev.dates.map(d => ({ ...d, is_start: false })) }))
    setMaisMenuAberto(false)
    showToast('Defina novo Marco Zero (botão direito numa data)', 'info')
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

  // Busca de aluno usa Autocomplete com items pré-fetchados (ver render).

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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/painel-feedbacks')}
            title="Voltar ao Painel"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#323238] text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Planejamento</p>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight">Planejar Feedbacks do Aluno</h1>
            {aluno && <p className="text-gray-500 text-xs mt-1">{aluno.nome_completo}</p>}
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 max-w-full">
          {aluno && (
            <Button variant="primary" size="sm" icon={Save}
              onClick={handleSalvar} loading={salvando}
              className="whitespace-nowrap shrink-0">
              Salvar
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Palmtree}
            onClick={() => setModalFerias(true)}
            className="whitespace-nowrap shrink-0">
            Cadastre suas férias
          </Button>
          <Button variant="secondary" size="sm" icon={MessageSquare}
            onClick={() => setModalTemplatesAberto(true)}
            className="whitespace-nowrap shrink-0">
            Modelos de mensagem
          </Button>
          {aluno && (
            <>
              <Button variant="secondary" size="sm" icon={Wand2}
                onClick={() => setModalGerarSerie(true)}
                className="whitespace-nowrap shrink-0">
                Padronizar
              </Button>
              <Button variant="secondary" size="sm" icon={Users}
                onClick={() => setModalClonar(true)}
                className="whitespace-nowrap shrink-0">
                Clonar de outro aluno
              </Button>
              <Button variant="secondary" size="sm" icon={Wand2}
                onClick={handleRenovarCiclo}
                title="Zera a vigência mantendo histórico de datas. Defina novo Marco Zero depois."
                className="whitespace-nowrap shrink-0 !text-blue-300 !border-blue-500/30">
                Renovar ciclo
              </Button>
              <Button variant="danger" size="sm" icon={Trash2}
                onClick={handleLimparCronograma}
                className="whitespace-nowrap shrink-0">
                Limpar cronograma
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sem aluno selecionado: hub com lista de alunos + status do cronograma */}
      {!aluno && <HubAlunosCronograma />}

      {/* Estado normal */}
      {aluno && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ─── Coluna esquerda ─────────────────────────────────────────── */}
          <div className="lg:col-span-6 space-y-4">

            {/* Aluno: autocomplete pra trocar inline */}
            <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar nome={aluno.nome_completo} size="sm" />
                <div className="flex-1 min-w-0">
                  <Autocomplete
                    searchFn={async (q) => {
                      if (!q || q.length < 2) return []
                      const res = await listarAlunos({ search: q, limit: 30 })
                      return (res.list || []).filter(a => a.name !== aluno.name)
                    }}
                    onSelect={(a) => a?.name && navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(a.name)}`)}
                    renderItem={(a) => (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar nome={a.nome_completo} foto={a.foto} size="sm" />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{a.nome_completo}</p>
                          {a.email && <p className="text-gray-500 text-[11px] truncate">{a.email}</p>}
                        </div>
                      </div>
                    )}
                    placeholder={aluno.nome_completo}
                    icon={Search}
                    compact
                  />
                </div>
              </div>
              {planForm.plan_start && planForm.plan_end && (
                <p className="text-gray-500 text-[11px] truncate pl-12">
                  Plano: {fmtDateBR(planForm.plan_start)} → {fmtDateBR(planForm.plan_end)} ({planForm.plan_duration} meses)
                </p>
              )}
            </div>

            {/* Stats — só do ciclo atual (a partir do último Marco Zero) */}
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
            {stats.historicoCount > 0 && (
              <p className="text-[10px] text-gray-500 italic -mt-2">
                Stats do ciclo atual. Histórico passivo: {stats.historicoCount} data{stats.historicoCount === 1 ? '' : 's'} antes do Marco Zero.
              </p>
            )}

            {/* Lista de datas agrupada por ciclo */}
            <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">
              <div className="px-3 py-3 border-b border-[#323238] flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Datas do Cronograma</h3>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="xs" icon={Wand2}
                    onClick={() => setModalGerarSerie(true)}>Padronizar</Button>
                  <Button variant="secondary" size="xs" icon={Copy}
                    onClick={handleCopiarMensagem}>Copiar msg</Button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {schedule.dates.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 text-xs">Nenhuma data ainda. Use o calendário ao lado ou clique em <span className="text-purple-300 font-semibold">Padronizar</span>.</p>
                  </div>
                ) : (
                  <div>
                    {/* Cabeçalho da tabela */}
                    <div className="grid grid-cols-[78px_44px_1fr_44px_92px_24px] gap-1.5 px-3 py-2 border-b border-[#323238] bg-[#1a1a1a]/60">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Tipo</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Formulário</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Int.</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Ciclo</span>
                      <span />
                    </div>
                    {grupos.map((grupo, gi) => grupo.items.map((d, idx) => {
                      const ehUltimaDoGrupo = idx === grupo.items.length - 1
                      // Intervalo em semanas até a linha anterior do MESMO grupo
                      const prev = idx > 0 ? grupo.items[idx - 1] : null
                      const intervalo = prev
                        ? Math.round((new Date(d.date) - new Date(prev.date)) / (7 * 86400000))
                        : 0
                      return (
                        <div key={d.date}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setMarcoZeroMenu({ date: d.date, x: e.clientX, y: e.clientY })
                          }}
                          className={`grid grid-cols-[78px_44px_1fr_44px_92px_24px] gap-1.5 px-3 py-2 border-b border-[#323238]/40 items-center transition-colors ${
                            d.is_start ? 'bg-[#2563eb]/15' : 'hover:bg-[#1e1e22]'
                          }`}>
                          <span className="text-white font-medium text-xs">{fmtDateBR(d.date)}</span>
                          <span className="flex justify-center">
                            <TipoBotao item={d}
                              onToggle={(_, v) => handleToggleTraining(d.date, v)}
                              variant="icon"
                              size="sm" />
                          </span>
                          <select
                            value={d.formulario || formularioSugerido || ''}
                            onChange={(e) => handleSetFormulario(d.date, e.target.value)}
                            className="h-7 px-1 bg-[#1a1a1a] border border-[#323238] text-white rounded text-[11px] outline-none focus:border-[#2563eb]/60 truncate"
                          >
                            {formulariosCompativeis.map((f) => (
                              <option key={f.name} value={f.name}>{f.titulo}</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-gray-500 text-center">
                            {intervalo > 0 ? `${intervalo}s` : '—'}
                          </span>
                          <span className="text-center">
                            {ehUltimaDoGrupo ? (
                              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                grupo.label === 'Ciclo a definir'
                                  ? 'bg-gray-500/10 text-gray-400 border-gray-500/30 italic'
                                  : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              }`}>
                                {grupo.label}
                              </span>
                            ) : null}
                          </span>
                          <button onClick={() => handleRemoverDataLocal(d.date)}
                            title="Remover"
                            className="h-6 w-6 inline-flex items-center justify-center text-gray-500 hover:text-red-400">
                            <X size={12} />
                          </button>
                        </div>
                      )
                    }))}

                    {/* Total planejado */}
                    {schedule.dates.length > 0 && (
                      <div className="grid grid-cols-[78px_44px_1fr_44px_92px_24px] gap-1.5 px-3 py-2 border-t border-[#323238] bg-[#1a1a1a]/60 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 col-span-4">
                          Total planejado
                        </span>
                        <span className="text-center">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-[#850000]/10 text-red-300 border-[#850000]/40">
                            {stats.semanas} semanas
                          </span>
                        </span>
                        <span />
                      </div>
                    )}

                    {/* Adicionar data avulsa */}
                    <div className="px-3 py-2 border-t border-[#323238]">
                      <Button variant="ghost" size="xs" icon={Plus}
                        onClick={() => setModalNovoDia({
                          date: todayISO(),
                          formulario: formularioSugerido || '',
                          dias_aviso: 1,
                          is_start: false,
                          nota: '',
                        })}>
                        Adicionar data avulsa
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {schedule.dates.length > 0 && (
                <div className="px-3 py-2 border-t border-[#323238] text-[10px] text-gray-500">
                  Clique direito em uma linha para definir Marco Zero.
                </div>
              )}
            </div>
          </div>

          {/* ─── Coluna direita ──────────────────────────────────────────── */}
          <div className="lg:col-span-6 space-y-4">

            {/* Vigência: read-only quando há contrato, editável quando não */}
            <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Vigência do Plano</h3>
                {contratoRelevante ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {contratoRelevante.nome_plano_snapshot || contratoRelevante.plano || 'Contrato'} · do Financeiro
                    </span>
                    <button
                      onClick={() => navigate('/financeiro')}
                      className="text-[10px] font-bold uppercase tracking-widest text-blue-300 hover:text-blue-200 underline">
                      Editar no Financeiro
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 italic">
                    Aluno sem contrato — edição manual
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FormGroup label="Início">
                  <Input type="date" value={planForm.plan_start}
                    onChange={(v) => handlePlanFormChange('plan_start', v)}
                    disabled={!!contratoRelevante} />
                </FormGroup>
                <FormGroup label="Duração (meses)">
                  <Input type="number" value={String(planForm.plan_duration)}
                    onChange={(v) => handlePlanFormChange('plan_duration', Number(v) || 0)}
                    disabled={!!contratoRelevante} />
                </FormGroup>
                <FormGroup label="Fim (auto)" hint={contratoRelevante ? 'Vem do contrato' : 'Início + duração'}>
                  <Input type="date" value={planForm.plan_end} onChange={() => {}} disabled />
                </FormGroup>
              </div>
            </div>

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
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 12 }, (_, m) => (
                    <MesGrid
                      key={m}
                      year={viewYear}
                      month={m}
                      schedule={schedule}
                      feriasList={feriasList}
                      planStart={planForm.plan_start}
                      planEnd={planForm.plan_end}
                      onClickDate={onClickDate}
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
      )}

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

      {marcoZeroMenu && (
        <MarcoZeroMenu
          menu={marcoZeroMenu}
          itemAtual={itemDoDia(marcoZeroMenu.date)}
          onClose={() => setMarcoZeroMenu(null)}
          onSet={(novoVal) => handleSetMarcoZero(marcoZeroMenu.date, novoVal)}
          onAbrirDetalhes={(item) => setModalNovoDia({
            date: item.date,
            formulario: item.formulario || formularioSugerido || '',
            dias_aviso: item.dias_aviso || 1,
            is_start: !!item.is_start,
            nota: item.nota || '',
            _editando: true,
          })}
          onRemover={(item) => handleRemoverDataLocal(item.date)}
        />
      )}

      <Toast {...toast} />
    </div>
  )
}
