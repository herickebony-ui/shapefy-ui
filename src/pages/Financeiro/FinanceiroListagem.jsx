import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, RefreshCw, Search, CalendarDays, SlidersHorizontal,
  TrendingUp, History, Wallet, Users, FileDown, RefreshCcw, Eye, Edit2,
} from 'lucide-react'
import {
  Button, Spinner, EmptyState, DataTable, Tabs, StatCard, Badge,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import PlanoBadge from '../../components/financeiro/PlanoBadge'
import MesBadge from '../../components/financeiro/MesBadge'
import StudentBadge from '../../components/financeiro/StudentBadge'
import { listarContratos, renovarContrato, buscarContrato } from '../../api/contratosAluno'
import { listarPlanos } from '../../api/planosShapefy'
import { listarAlunosByIds } from '../../api/alunos'
import {
  formatCurrency, formatDateBr, isBetweenInclusive, normalizeDate,
  getRangeFromMonth, monthLabelFromYM, currentYM, smartSearch,
  isContratoCobreMes, contratoNoPeriodo, withConcurrency, getTodayISO,
  computeContratoStatus, dataPagamentoEfetivaParcela,
} from './utils'
import { STATUS_BADGE } from './constants'
import { gerarRelatorioFinanceiro } from './pdf'
import PlanosModal from './PlanosModal'
import ContratoFormModal from './ContratoFormModal'
import ContratoDetalheModal from './ContratoDetalheModal'
import RenovarContratoModal from './RenovarContratoModal'
import AuditoriaModal from './AuditoriaModal'
import HistoricoAlunoModal from './HistoricoAlunoModal'

const PAGE_SIZE = 50

export default function FinanceiroListagem() {
  const [view, setView] = useState('records') // 'records' | 'students'
  const [loading, setLoading] = useState(true)
  const [contratos, setContratos] = useState([])
  const [planos, setPlanos] = useState([])
  const [alunosMap, setAlunosMap] = useState({})

  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [sortType, setSortType] = useState('date_desc')

  const [dateMode, setDateMode] = useState('month')
  const [selectedMonth, setSelectedMonth] = useState(currentYM())
  const [dateRange, setDateRange] = useState(() => getRangeFromMonth(currentYM()))
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const monthRef = useRef(null)

  const [page, setPage] = useState(1)
  const [parcelasDoPeriodo, setParcelasDoPeriodo] = useState([]) // achatadas
  const [carregandoParcelas, setCarregandoParcelas] = useState(false)
  const [exportandoPdf, setExportandoPdf] = useState(false)

  // modais
  const [planosModalOpen, setPlanosModalOpen] = useState(false)
  const [auditoriaModalOpen, setAuditoriaModalOpen] = useState(false)
  const [renovarModalOpen, setRenovarModalOpen] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState(null) // { id, nome }
  const [contratoForm, setContratoForm] = useState(null) // null | 'novo' | { contrato, alunoNome }
  const [contratoDetalhe, setContratoDetalhe] = useState(null) // { contratoId, alunoNome }

  useEffect(() => {
    if (dateMode === 'month') {
      const r = getRangeFromMonth(selectedMonth)
      if (r) setDateRange(r)
    }
  }, [selectedMonth, dateMode])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [contratosRes, planosRes] = await Promise.all([
        listarContratos({ limit: 200 }),
        listarPlanos({ limit: 100 }),
      ])
      setContratos(contratosRes.list)
      setPlanos(planosRes.list)

      const alunoIds = [...new Set(contratosRes.list.map((c) => c.aluno).filter(Boolean))]
      if (alunoIds.length) {
        const alunos = await listarAlunosByIds(alunoIds)
        const map = {}
        alunos.forEach((a) => { map[a.name] = a })
        setAlunosMap(map)
      } else {
        setAlunosMap({})
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar financeiro: ' + (e.response?.data?.exception || e.message))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Carrega parcelas dos contratos relevantes (concorrência limitada)
  // Inclui: contratos no dateRange selecionado + carteira ativa
  // (vigentes ou pago-e-não-iniciado) pra alimentar "Parcelamentos a receber".
  useEffect(() => {
    let cancelado = false
    const carregarParcelas = async () => {
      if (!contratos.length) { setParcelasDoPeriodo([]); return }
      const hojeISO = getTodayISO()
      const candidatos = contratos.filter((c) => {
        if (c.status_manual === 'Pausado') return false
        // Carteira ativa: contrato vigente OU pago e não iniciado
        const fim = normalizeDate(c.data_fim)
        const dp = normalizeDate(c.data_pagamento_principal)
        const inicio = normalizeDate(c.data_inicio)
        if (fim && fim >= hojeISO) return true
        if (!inicio && dp) return true
        // Contrato no dateRange selecionado (pra Recebido/Forecast)
        if (contratoNoPeriodo(c, dateRange.start, dateRange.end)) return true
        return false
      })
      if (!candidatos.length) { setParcelasDoPeriodo([]); return }
      setCarregandoParcelas(true)
      const detalhes = await withConcurrency(candidatos, 4, async (c) => {
        try {
          const d = await buscarContrato(c.name)
          return { contrato: c, detalhe: d }
        } catch { return null }
      })
      if (cancelado) return
      const flat = []
      detalhes.forEach((row) => {
        if (!row?.detalhe?.parcelas) return
        const c = row.contrato
        row.detalhe.parcelas.forEach((p) => {
          flat.push({
            ...p,
            contrato: c.name,
            aluno: c.aluno,
            plano: c.plano,
            nome_plano_snapshot: c.nome_plano_snapshot,
            qtd_parcelas: c.qtd_parcelas,
            // Pra cálculo "pago efetivo": contratos com data_pagamento_principal
            // preenchida cobrem a parcela 1 (entrada do parcelado ou única do à vista)
            // sem precisar de baixa explícita por parcela.
            modalidade: c.modalidade,
            contrato_data_pagamento_principal: c.data_pagamento_principal,
          })
        })
      })
      setParcelasDoPeriodo(flat)
      setCarregandoParcelas(false)
    }
    carregarParcelas()
    return () => { cancelado = true }
  }, [contratos, dateRange])

  const planosByName = useMemo(() => {
    const m = {}
    planos.forEach((p) => { m[p.name] = p })
    return m
  }, [planos])

  const planoOptions = useMemo(() => [
    { value: '', label: 'Todos os planos' },
    ...planos.map((p) => ({ value: p.name, label: p.nome_plano || p.name })),
  ], [planos])

  const stats = useMemo(() => {
    const ativos = new Set()
    const renovamNoMes = new Set()
    const pausados = new Set()
    const pagosNaoIniciados = new Set()
    let valorVigentes = 0
    contratos.forEach((c) => {
      const fim = normalizeDate(c.data_fim)
      const inicio = normalizeDate(c.data_inicio)
      const dp = normalizeDate(c.data_pagamento_principal)
      const venceNoMes = fim && isBetweenInclusive(fim, dateRange.start, dateRange.end)
      if (c.status_manual === 'Pausado') {
        pausados.add(c.aluno)
        return
      }
      if (isContratoCobreMes(c, dateRange.start, dateRange.end)) {
        ativos.add(c.aluno)
        valorVigentes += parseFloat(c.valor_liquido_total) || 0
      }
      if (venceNoMes) renovamNoMes.add(c.aluno)
      if (!inicio && dp && isBetweenInclusive(dp, dateRange.start, dateRange.end)) {
        pagosNaoIniciados.add(c.aluno)
      }
    })

    // KPIs reais via parcelas (caixa + a receber)
    // Usa dataPagamentoEfetivaParcela: parcela é paga se tem data_pagamento
    // próprio OU se está coberta pela data_pagamento_principal do contrato
    // (à vista, ou parcela 1 do parcelado).
    let faturamentoReal = 0
    let aReceber = 0
    parcelasDoPeriodo.forEach((p) => {
      const dataPag = dataPagamentoEfetivaParcela(p)
      const dv = normalizeDate(p.data_vencimento)
      const valor = parseFloat(p.valor_parcela) || 0

      if (dataPag && dataPag >= dateRange.start && dataPag <= dateRange.end) {
        faturamentoReal += valor
      } else if (dv && dv >= dateRange.start && dv <= dateRange.end && !dataPag) {
        aReceber += valor
      }
    })

    // Taxa de Retenção: dos que venceram no período (não pausados),
    // quantos foram renovados (existe outro contrato com renovacao_de === c.name)
    const idsRenovados = new Set(
      contratos.map((c) => c.renovacao_de).filter(Boolean),
    )
    const venceramNoPeriodo = contratos.filter((c) => {
      const fim = normalizeDate(c.data_fim)
      if (!fim || c.status_manual === 'Pausado') return false
      return fim >= dateRange.start && fim <= dateRange.end
    })
    const renovadosNoPeriodo = venceramNoPeriodo.filter((c) => idsRenovados.has(c.name))
    const taxaRetencao = venceramNoPeriodo.length
      ? Math.round((renovadosNoPeriodo.length / venceramNoPeriodo.length) * 100)
      : null

    // Parcelamentos a receber — parcelas pendentes que vencem no mês selecionado
    // (não a carteira inteira). Pra ter visibilidade do mês.
    let parcelamentosAReceberValor = 0
    let parcelamentosAReceberQtd = 0
    parcelasDoPeriodo.forEach((p) => {
      const dataPag = dataPagamentoEfetivaParcela(p)
      if (dataPag) return
      const dv = normalizeDate(p.data_vencimento)
      if (!dv || dv < dateRange.start || dv > dateRange.end) return
      parcelamentosAReceberValor += parseFloat(p.valor_parcela) || 0
      parcelamentosAReceberQtd += 1
    })

    // Forecast — receita potencial de renovação: contratos não pausados
    // com data_fim caindo no mês selecionado, somando valor_liquido_total.
    let forecastRenovacaoValor = 0
    let forecastRenovacaoQtd = 0
    contratos.forEach((c) => {
      if (c.status_manual === 'Pausado') return
      const fim = normalizeDate(c.data_fim)
      if (!fim || fim < dateRange.start || fim > dateRange.end) return
      forecastRenovacaoValor += parseFloat(c.valor_liquido_total) || 0
      forecastRenovacaoQtd += 1
    })

    return {
      ativos: ativos.size,
      renovamNoMes: renovamNoMes.size,
      pausados: pausados.size,
      pagosNaoIniciados: pagosNaoIniciados.size,
      valorVigentes,
      faturamentoReal,
      aReceber,
      previsao: faturamentoReal + aReceber, // legacy (PDF ainda usa)
      forecastRenovacaoValor,
      forecastRenovacaoQtd,
      parcelamentosAReceberValor,
      parcelamentosAReceberQtd,
      taxaRetencao,
      taxaRetencaoNum: { renovados: renovadosNoPeriodo.length, venceram: venceramNoPeriodo.length },
      totalContratos: contratos.length,
    }
  }, [contratos, parcelasDoPeriodo, dateRange])

  const filteredContratos = useMemo(() => {
    const hoje = getTodayISO()
    let list = contratos.filter((c) => {
      const aluno = alunosMap[c.aluno]
      const nomeAluno = aluno?.nome_completo || c.aluno || ''

      if (busca && !smartSearch(nomeAluno, busca) && !smartSearch(c.name, busca)) return false
      if (filtroPlano && c.plano !== filtroPlano) return false

      // Filtros de status — cobrem os 6 tipos do antigo
      const inicio = normalizeDate(c.data_inicio)
      const fim = normalizeDate(c.data_fim)
      const dp = normalizeDate(c.data_pagamento_principal)
      const isPausado = c.status_manual === 'Pausado'
      const isPagoNaoIniciado = !inicio && !!dp
      const isVencido = !!fim && fim < hoje && !isPausado
      const venceNoPeriodo = !!fim && fim >= dateRange.start && fim <= dateRange.end
      const pagoNoPeriodo = !!dp && dp >= dateRange.start && dp <= dateRange.end

      if (filtroStatus === 'Ativo' && isPausado) return false
      if (filtroStatus === 'Pausado' && !isPausado) return false
      if (filtroStatus === 'Pago_nao_iniciado' && !isPagoNaoIniciado) return false
      if (filtroStatus === 'Vencido' && !isVencido) return false
      if (filtroStatus === 'Renova_periodo' && !venceNoPeriodo) return false
      if (filtroStatus === 'Pagos_periodo' && !pagoNoPeriodo) return false

      // "Pagos no período" não exige contratoNoPeriodo (é atalho de caixa)
      if (filtroStatus !== 'Pagos_periodo' && !contratoNoPeriodo(c, dateRange.start, dateRange.end)) return false
      return true
    })

    list.sort((a, b) => {
      const aFim = normalizeDate(a.data_fim) || ''
      const bFim = normalizeDate(b.data_fim) || ''
      const aNome = (alunosMap[a.aluno]?.nome_completo || '').toLowerCase()
      const bNome = (alunosMap[b.aluno]?.nome_completo || '').toLowerCase()
      if (sortType === 'date_asc') return (aFim || '9999').localeCompare(bFim || '9999')
      if (sortType === 'alpha_asc') return aNome.localeCompare(bNome)
      if (sortType === 'valor_desc') return (parseFloat(b.valor_liquido_total) || 0) - (parseFloat(a.valor_liquido_total) || 0)
      return (bFim || '0000').localeCompare(aFim || '0000')
    })

    return list
  }, [contratos, alunosMap, busca, filtroPlano, filtroStatus, dateRange, sortType])

  const columns = useMemo(() => [
    {
      label: 'Aluno',
      render: (row) => {
        const aluno = alunosMap[row.aluno]
        const nome = aluno?.nome_completo || row.aluno || '—'
        return (
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{nome}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {row.name} {row.renovacao_de && <span className="text-blue-400">· Renovação</span>}
            </div>
          </div>
        )
      },
    },
    {
      label: 'Status',
      render: (row) => {
        const aluno = alunosMap[row.aluno]
        return (
          <div className="flex flex-col gap-1">
            {row.status_manual === 'Pausado' && (
              <Badge variant="default" size="sm">Pausado</Badge>
            )}
            <StudentBadge aluno={aluno} />
          </div>
        )
      },
    },
    {
      label: 'Vigência',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => {
        const statusKey = computeContratoStatus(row, getTodayISO(), dateRange)
        const cfg = STATUS_BADGE[statusKey] || STATUS_BADGE.Pendente
        const inicio = normalizeDate(row.data_inicio)
        const dp = normalizeDate(row.data_pagamento_principal)
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.className}`}>
              {cfg.label}
            </span>
            {!inicio && dp && (
              <div className="text-[11px] text-gray-400">
                Pago em <span className="text-white font-mono">{formatDateBr(row.data_pagamento_principal)}</span>
              </div>
            )}
            {inicio && (
              <>
                <div className="text-[10px] text-gray-500">
                  Início: <span className="text-gray-400">{formatDateBr(row.data_inicio)}</span>
                </div>
                <MesBadge data={row.data_fim} />
              </>
            )}
          </div>
        )
      },
    },
    {
      label: 'Plano',
      render: (row) => {
        const plano = planosByName[row.plano]
        return (
          <div>
            <PlanoBadge nome={row.nome_plano_snapshot || row.plano} cor={plano?.cor || 'slate'} />
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              {row.modalidade} · {row.metodo_pagamento}
              {row.rotulo_variacao && <> · {row.rotulo_variacao}</>}
            </div>
          </div>
        )
      },
    },
    {
      label: 'Valor',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => {
        const total = parseFloat(row.valor_liquido_total) || 0
        const qtd = row.qtd_parcelas || 1
        const isParcelado = qtd > 1
        const valorParcela = isParcelado ? total / qtd : total
        // Valor pago via parcelas — usa data efetiva (cobre data_pagamento_principal)
        const parcelasContrato = parcelasDoPeriodo.filter((p) => p.contrato === row.name)
        const pago = parcelasContrato.reduce((acc, p) =>
          dataPagamentoEfetivaParcela(p) ? acc + (parseFloat(p.valor_parcela) || 0) : acc, 0)
        const obs = (row.observacoes || '').trim()
        return (
          <div>
            <div className="font-mono font-bold text-white text-sm">
              {formatCurrency(valorParcela)}
              {isParcelado && <span className="ml-1 text-gray-500 text-[10px] font-sans font-normal">/parcela</span>}
            </div>
            {isParcelado && (
              <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                {qtd}× · total {formatCurrency(total)}
              </div>
            )}
            {pago > 0 && (
              <div className="text-[10px] text-green-400 font-sans mt-0.5">
                pago {formatCurrency(pago)}
              </div>
            )}
            {obs && (
              <div
                title={obs}
                className="text-[10px] text-gray-400 italic font-sans mt-0.5 max-w-[180px] truncate text-right"
              >
                “{obs}”
              </div>
            )}
          </div>
        )
      },
    },
    {
      label: '',
      headerClass: 'w-24',
      cellClass: 'text-right',
      render: (row) => {
        const alunoNome = alunosMap[row.aluno]?.nome_completo || row.aluno
        return (
          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setHistoricoAluno({ id: row.aluno, nome: alunoNome })}
              title="Histórico do aluno (todos os contratos)"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
            >
              <History size={12} />
            </button>
            <button
              onClick={() => setContratoForm({ contrato: row, alunoNome })}
              title="Editar contrato"
              className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={() => setContratoDetalhe({ contratoId: row.name, alunoNome })}
              title="Detalhes do contrato (parcelas e ações)"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
            >
              <Eye size={12} />
            </button>
          </div>
        )
      },
    },
  ], [alunosMap, planosByName, parcelasDoPeriodo])

  const onSucessoMutacao = useCallback(() => {
    carregar()
  }, [carregar])

  const exportarPdf = useCallback(() => {
    if (carregandoParcelas) {
      alert('Aguardando carga das parcelas. Tente novamente em alguns segundos.')
      return
    }
    setExportandoPdf(true)
    try {
      gerarRelatorioFinanceiro({
        range: dateRange,
        contratos,
        parcelas: parcelasDoPeriodo,
        alunosMap,
        kpis: {
          ativos: stats.ativos,
          faturamentoReal: stats.faturamentoReal,
          previsao: stats.previsao,
        },
        profissionalNome: localStorage.getItem('frappe_user_name') || localStorage.getItem('frappe_user') || '',
      })
    } catch (e) {
      alert('Erro ao gerar PDF: ' + (e?.message || e))
    } finally {
      setExportandoPdf(false)
    }
  }, [carregandoParcelas, dateRange, contratos, parcelasDoPeriodo, alunosMap, stats])

  return (
    <ListPage
      title="Financeiro"
      subtitle="Contratos, planos e faturamento"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
          <Button
            variant="secondary"
            size="sm"
            icon={FileDown}
            onClick={exportarPdf}
            loading={exportandoPdf}
            className="hidden sm:inline-flex"
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={History}
            onClick={() => setAuditoriaModalOpen(true)}
            className="hidden sm:inline-flex"
          >
            Auditoria
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCcw}
            onClick={() => setRenovarModalOpen(true)}
            className="hidden sm:inline-flex"
          >
            Renovar pagamento
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setContratoForm('novo')}>
            Novo pagamento
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          variant="pills"
          tabs={[
            { id: 'records', label: 'Pagamentos', icon: <Wallet size={14} /> },
            { id: 'students', label: 'Gestão de Alunos', icon: <Users size={14} /> },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      {/* KPIs (mudam por aba) */}
      <div className={`grid gap-3 mb-4 ${
        view === 'records'
          ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 md:grid-cols-4'
      }`}>
        {view === 'records' ? (
          <>
            <StatCard label="Alunos com plano vigente" value={stats.ativos} />
            <StatCard
              label={carregandoParcelas ? 'Recebido (período)…' : 'Recebido no período'}
              value={formatCurrency(stats.faturamentoReal)}
              color="success"
            />
            <StatCard
              label="Forecast (renovações)"
              value={formatCurrency(stats.forecastRenovacaoValor)}
              unit={`${stats.forecastRenovacaoQtd} contrato${stats.forecastRenovacaoQtd === 1 ? '' : 's'}`}
              color="success"
            />
            <StatCard
              label={carregandoParcelas ? 'Parcelas (período)…' : 'Parcelamentos a receber'}
              value={formatCurrency(stats.parcelamentosAReceberValor)}
              unit={`${stats.parcelamentosAReceberQtd} parcela${stats.parcelamentosAReceberQtd === 1 ? '' : 's'}`}
              color="warning"
            />
            <div title={stats.taxaRetencao != null
                ? `${stats.taxaRetencaoNum.renovados} renovaram de ${stats.taxaRetencaoNum.venceram} que venceram`
                : 'Sem contratos vencendo no período'}>
              <StatCard
                label="Taxa de retenção"
                value={stats.taxaRetencao != null ? `${stats.taxaRetencao}%` : '—'}
                unit={stats.taxaRetencao != null ? `${stats.taxaRetencaoNum.renovados}/${stats.taxaRetencaoNum.venceram}` : ''}
                color={
                  stats.taxaRetencao == null ? 'muted'
                  : stats.taxaRetencao >= 70 ? 'success'
                  : stats.taxaRetencao >= 40 ? 'warning'
                  : 'danger'
                }
              />
            </div>
          </>
        ) : (
          <>
            <StatCard label="Ativos no período" value={stats.ativos} />
            <StatCard label="Renovam este mês" value={stats.renovamNoMes} color="warning" />
            <StatCard label="Pausados" value={stats.pausados} color="muted" />
            <StatCard
              label="Pagos, não iniciados"
              value={stats.pagosNaoIniciados}
              color={stats.pagosNaoIniciados > 0 ? 'warning' : 'muted'}
            />
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <div className="md:col-span-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por aluno ou contrato..."
            className="w-full h-10 pl-9 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 placeholder-gray-600"
          />
        </div>

        <div className="md:col-span-3">
          <div className="relative flex items-center justify-between gap-2 bg-[#1a1a1a] rounded-lg border border-[#323238] px-3 h-10">
            <button
              type="button"
              onClick={() => {
                const el = monthRef.current
                if (!el) return
                if (el.showPicker) el.showPicker()
                else el.click()
              }}
              className="flex items-center gap-2 font-bold text-white text-xs min-w-0"
              title="Selecionar mês"
            >
              <CalendarDays size={14} className="text-gray-500" />
              <span className="tracking-wide truncate">{monthLabelFromYM(selectedMonth)}</span>
            </button>
            <button
              type="button"
              onClick={() => { setDateMode('custom'); setCustomRangeOpen(true) }}
              className="h-7 w-7 shrink-0 rounded-lg border border-[#323238] bg-[#29292e] hover:bg-[#323238] grid place-items-center transition-colors"
              title="Personalizar período"
            >
              <SlidersHorizontal size={12} className="text-gray-400" />
            </button>
            <input
              ref={monthRef}
              type="month"
              value={selectedMonth}
              onChange={(e) => { setDateMode('month'); setSelectedMonth(e.target.value) }}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
            />
            {customRangeOpen && (
              <>
                <div className="fixed inset-0 z-40" onMouseDown={() => setCustomRangeOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-[300px] bg-[#222226] border border-[#323238] rounded-xl shadow-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Período personalizado
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => { setDateMode('custom'); setDateRange({ ...dateRange, start: e.target.value }) }}
                      className="h-9 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60"
                    />
                    <span className="text-gray-500 text-xs">→</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => { setDateMode('custom'); setDateRange({ ...dateRange, end: e.target.value }) }}
                      className="h-9 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60"
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    <button
                      type="button"
                      onClick={() => { setDateMode('month'); setCustomRangeOpen(false) }}
                      className="h-8 px-3 rounded-lg border border-[#323238] text-gray-400 hover:text-white text-xs font-bold"
                    >
                      Voltar pro mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomRangeOpen(false)}
                      className="h-8 px-3 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <select
            value={filtroPlano}
            onChange={(e) => setFiltroPlano(e.target.value)}
            className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60"
          >
            {planoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60"
          >
            <option value="">Todos os status</option>
            <option value="Ativo">Não pausados</option>
            <option value="Pausado">Pausados</option>
            <option value="Pago_nao_iniciado">Pago, não iniciado</option>
            <option value="Vencido">Vencidos</option>
            <option value="Renova_periodo">Renova no período</option>
            <option value="Pagos_periodo">💰 Pagos no período</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className="w-full h-10 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60"
            title="Ordenar"
          >
            <option value="date_desc">Recentes</option>
            <option value="date_asc">Antigos</option>
            <option value="alpha_asc">A→Z</option>
            <option value="valor_desc">Maior valor</option>
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : view === 'records' ? (
        filteredContratos.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="Nenhum contrato no período"
              description={busca ? `Sem resultados para "${busca}"` : 'Tente outro mês ou crie um novo lançamento.'}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={filteredContratos}
            rowKey="name"
            page={page}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            onRowClick={(row) => setContratoDetalhe({ contratoId: row.name, alunoNome: alunosMap[row.aluno]?.nome_completo || row.aluno })}
          />
        )
      ) : (
        <GestaoAlunosTab
          contratos={contratos}
          planos={planos}
          alunosMap={alunosMap}
          busca={busca}
          dateRange={dateRange}
          onAbrirHistorico={(id, nome) => setHistoricoAluno({ id, nome })}
          onAbrirContrato={(contratoId, alunoNome) => setContratoDetalhe({ contratoId, alunoNome })}
          onRenovar={async (contrato, alunoNome) => {
            if (!window.confirm(`Renovar contrato ${contrato.name} de ${alunoNome}?`)) return
            try {
              await renovarContrato(contrato.name)
              await carregar()
            } catch (e) {
              alert('Erro ao renovar: ' + (e.response?.data?.exception || e.message))
            }
          }}
        />
      )}

      {/* Modais */}
      <PlanosModal
        isOpen={planosModalOpen}
        onClose={() => setPlanosModalOpen(false)}
        planos={planos}
        onMutate={onSucessoMutacao}
      />
      <ContratoFormModal
        isOpen={!!contratoForm}
        mode={contratoForm === 'novo' ? 'novo' : 'editar'}
        contrato={contratoForm === 'novo' ? null : contratoForm?.contrato}
        alunoNome={contratoForm === 'novo' ? '' : contratoForm?.alunoNome}
        planos={planos}
        contratos={contratos}
        onClose={() => setContratoForm(null)}
        onSuccess={onSucessoMutacao}
      />
      <ContratoDetalheModal
        isOpen={!!contratoDetalhe}
        contratoId={contratoDetalhe?.contratoId}
        alunoNome={contratoDetalhe?.alunoNome}
        planos={planos}
        onClose={() => setContratoDetalhe(null)}
        onMutate={onSucessoMutacao}
        onEditar={(contrato, alunoNome) => {
          setContratoDetalhe(null)
          setContratoForm({ contrato, alunoNome })
        }}
      />
      <RenovarContratoModal
        isOpen={renovarModalOpen}
        onClose={() => setRenovarModalOpen(false)}
        contratos={contratos}
        planos={planos}
        alunosMap={alunosMap}
        onSuccess={onSucessoMutacao}
      />
      <AuditoriaModal
        isOpen={auditoriaModalOpen}
        onClose={() => setAuditoriaModalOpen(false)}
        alunosMap={alunosMap}
      />
      <HistoricoAlunoModal
        isOpen={!!historicoAluno}
        alunoId={historicoAluno?.id}
        alunoNome={historicoAluno?.nome}
        planos={planos}
        alunosMap={alunosMap}
        onClose={() => setHistoricoAluno(null)}
      />
    </ListPage>
  )
}

function GestaoAlunosTab({
  contratos, planos, alunosMap, busca, dateRange,
  onAbrirHistorico, onAbrirContrato, onRenovar,
}) {
  const planosByName = useMemo(() => {
    const m = {}
    planos.forEach((p) => { m[p.name] = p })
    return m
  }, [planos])

  const lista = useMemo(() => {
    const map = new Map()
    contratos.forEach((c) => {
      if (!c.aluno) return
      if (!contratoNoPeriodo(c, dateRange.start, dateRange.end)) return
      const cur = map.get(c.aluno) || { contratos: [], pausados: 0, naoIniciados: 0 }
      cur.contratos.push(c)
      if (c.status_manual === 'Pausado') cur.pausados += 1
      if (!normalizeDate(c.data_inicio) && normalizeDate(c.data_pagamento_principal)) cur.naoIniciados += 1
      map.set(c.aluno, cur)
    })
    const arr = []
    map.forEach((v, alunoId) => {
      const aluno = alunosMap[alunoId]
      if (!aluno) return
      if (busca && !smartSearch(aluno.nome_completo, busca)) return
      // contrato com fim mais distante (mais relevante para "vigente")
      const contratoVigente = [...v.contratos].sort((a, b) =>
        (normalizeDate(b.data_fim) || '').localeCompare(normalizeDate(a.data_fim) || '')
      )[0]
      const venceNoMes = contratoVigente && (() => {
        const fim = normalizeDate(contratoVigente.data_fim)
        return fim && isBetweenInclusive(fim, dateRange.start, dateRange.end)
      })()
      arr.push({
        alunoId,
        aluno,
        contratos: v.contratos,
        contratoVigente,
        pausadoCount: v.pausados,
        naoIniciadosCount: v.naoIniciados,
        venceNoMes,
      })
    })
    arr.sort((a, b) => {
      // pausados por último, vencendo no mês primeiro
      const aPaus = a.pausadoCount > 0 ? 2 : 0
      const bPaus = b.pausadoCount > 0 ? 2 : 0
      const aVence = a.venceNoMes ? -1 : 0
      const bVence = b.venceNoMes ? -1 : 0
      const aWeight = aPaus + aVence
      const bWeight = bPaus + bVence
      if (aWeight !== bWeight) return aWeight - bWeight
      return (a.aluno.nome_completo || '').localeCompare(b.aluno.nome_completo || '')
    })
    return arr
  }, [contratos, alunosMap, busca, dateRange])

  if (!lista.length) {
    return (
      <div className="py-12">
        <EmptyState title="Nenhum aluno no período" description="Tente outro mês." />
      </div>
    )
  }

  const columns = [
    {
      label: 'Aluno',
      render: (row) => (
        <button
          type="button"
          onClick={() => onAbrirHistorico(row.alunoId, row.aluno.nome_completo)}
          className="text-left min-w-0 w-full"
        >
          <div className="font-semibold text-white text-sm truncate">{row.aluno.nome_completo}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {row.contratos.length} contrato{row.contratos.length > 1 ? 's' : ''} no período
            {row.pausadoCount > 0 && <span className="ml-2 text-gray-400">· {row.pausadoCount} pausado{row.pausadoCount > 1 ? 's' : ''}</span>}
            {row.naoIniciadosCount > 0 && <span className="ml-2 text-blue-400">· {row.naoIniciadosCount} pago{row.naoIniciadosCount > 1 ? 's' : ''} não iniciado{row.naoIniciadosCount > 1 ? 's' : ''}</span>}
          </div>
        </button>
      ),
    },
    {
      label: 'Status',
      render: (row) => <StudentBadge aluno={row.aluno} />,
    },
    {
      label: 'Plano vigente',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => {
        const c = row.contratoVigente
        if (!c) return <span className="text-gray-500 text-xs">—</span>
        const cor = planosByName[c.plano]?.cor || 'slate'
        return (
          <div>
            <PlanoBadge nome={c.nome_plano_snapshot || c.plano} cor={cor} />
            <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">
              {c.modalidade} · {c.rotulo_variacao || ''}
            </div>
          </div>
        )
      },
    },
    {
      label: 'Vencimento',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => {
        const c = row.contratoVigente
        if (!c?.data_fim) return <span className="text-gray-500 text-xs">—</span>
        return (
          <div>
            <MesBadge data={c.data_fim} />
            {row.venceNoMes && (
              <div className="text-[10px] text-yellow-400 mt-1 font-bold">Vence neste período</div>
            )}
          </div>
        )
      },
    },
    {
      label: 'Total líquido',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <div className="font-mono font-bold text-white text-sm">
          {formatCurrency(row.contratos.reduce((acc, c) => acc + (parseFloat(c.valor_liquido_total) || 0), 0))}
        </div>
      ),
    },
    {
      label: '',
      headerClass: 'w-32',
      cellClass: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAbrirHistorico(row.alunoId, row.aluno.nome_completo)}
            title="Histórico"
            className="h-7 w-7 inline-flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
          >
            <History size={12} />
          </button>
          <button
            onClick={() => row.contratoVigente && onAbrirContrato(row.contratoVigente.name, row.aluno.nome_completo)}
            disabled={!row.contratoVigente}
            title="Abrir contrato vigente"
            className="h-7 w-7 inline-flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors disabled:opacity-40"
          >
            <Eye size={12} />
          </button>
          {row.venceNoMes && row.contratoVigente && (
            <button
              onClick={() => onRenovar(row.contratoVigente, row.aluno.nome_completo)}
              title="Renovar"
              className="h-7 px-2 inline-flex items-center justify-center gap-1 text-blue-400 hover:text-white hover:bg-blue-600 border border-blue-500/30 hover:border-blue-600 rounded-lg transition-colors text-[10px] font-bold"
            >
              <RefreshCcw size={10} /> Renovar
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable columns={columns} rows={lista} rowKey="alunoId" />
  )
}
