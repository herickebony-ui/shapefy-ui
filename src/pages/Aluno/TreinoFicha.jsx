import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Play, Eye, History, AlertCircle, Activity, ChevronRight,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { buscarFichaTreino } from '../../api/treino'

// Padrao mobile glass — ver CLAUDE.md > Padrao Mobile.
const CARD = 'sf-card'
const CARD_DESTAQUE = 'sf-card sf-card--highlight'
const LABEL = 'text-[#60A5FA] text-[11px] font-bold uppercase'
const LABEL_STYLE = { letterSpacing: '0.18em' }

const fmtDataExtenso = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  if (partes.length !== 3) return ''
  const [ano, mes, dia] = partes.map(p => parseInt(p, 10))
  const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${dia} de ${meses[mes - 1]} de ${ano}`
}

const fmtDataHoraBR = (d) => {
  if (!d) return ''
  const [data, hora] = String(d).split(/[T ]/)
  const partes = data.split('-')
  const horaMin = (hora || '').slice(0, 5)
  return `${partes[2]}/${partes[1]}/${partes[0]}${horaMin ? ` as ${horaMin}` : ''}`
}

export default function TreinoFicha() {
  const { fichaName } = useParams()
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    buscarFichaTreino(fichaName)
      .then(res => {
        if (cancelado) return
        if (!res) { setErro('Ficha nao encontrada ou voce nao tem acesso a ela.'); return }
        setDados(res)
      })
      .catch(err => {
        if (cancelado) return
        console.error('Falha ao carregar ficha:', err)
        setErro(err.response?.status === 403
          ? 'Voce nao tem permissao para acessar essa ficha.'
          : 'Nao foi possivel carregar a ficha. Tente novamente.')
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [fichaName])

  const labelDe = (treinoId) => dados?.labels?.[treinoId] || treinoId
  const treinosDisponiveis = useMemo(() => dados?.treinos_disponiveis || [], [dados])

  if (carregando) {
    return (
      <div className="min-h-full bg-[var(--sf-bg)] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate('/aluno/treinos')}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--sf-border)] text-gray-300 hover:text-white hover:border-[#2563EB] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-5 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-[#60A5FA] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-sm leading-relaxed">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dados) return null

  const {
    ficha, dias_da_semana = [], ultimo_treino,
    periodizacao = [], execucoes_por_treino = {},
    aerobicos_total = 0,
  } = dados

  return (
    <div className="pb-10 bg-[var(--sf-bg)] min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[var(--sf-border)]">
        <button
          onClick={() => navigate('/aluno/treinos')}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[var(--sf-surface-2)] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
          Ficha de Treino
        </h1>
      </div>

      {/* Card geral: periodo */}
      <div className="px-4 mt-4">
        <div className={`${CARD} px-4 py-4`}>
          <p className={LABEL} style={LABEL_STYLE}>Periodo</p>
          <p className="text-white text-sm mt-1">
            {fmtDataExtenso(ficha?.data_de_inicio)} ate {fmtDataExtenso(ficha?.data_de_fim)}
          </p>
        </div>
      </div>

      {/* Ultimo treino */}
      {ultimo_treino?.treino && (
        <div className="px-4 mt-3">
          <div className={`${CARD} px-4 py-3 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] flex items-center justify-center text-[#60A5FA] shrink-0">
              <History size={14} />
            </div>
            <div className="min-w-0">
              <p className={LABEL} style={LABEL_STYLE}>Ultimo treino</p>
              <p className="text-white text-xs font-bold mt-0.5 truncate">
                {ultimo_treino.treino_label || ultimo_treino.treino}
              </p>
              <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">{fmtDataHoraBR(ultimo_treino.data_e_hora_do_inicio)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orientacoes gerais */}
      {ficha?.orientacoes && (
        <div className="px-4 mt-4">
          <div className={`${CARD} px-4 py-4`}>
            <p className={`${LABEL} mb-2`} style={LABEL_STYLE}>Orientacoes</p>
            <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
              {ficha.orientacoes}
            </p>
          </div>
        </div>
      )}

      {/* Distribuicao semanal */}
      <div className="px-4 mt-4">
        <div className={`${CARD} px-4 py-4`}>
          <p className={`${LABEL} mb-3`} style={LABEL_STYLE}>Distribuicao semanal</p>
          <div className="flex flex-col gap-1">
            {dias_da_semana.map((d, i) => {
              const ehOff = !d.treino || d.treino === 'Off'
              const diasPt = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
              const hojeNome = diasPt[new Date().getDay()]
              const ehHoje = (d.dia_da_semana || '').toLowerCase() === hojeNome.toLowerCase()
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                    ehHoje
                      ? 'bg-[var(--sf-surface-2)] border border-[#2563EB] text-[#60A5FA]'
                      : 'text-gray-300'
                  }`}
                >
                  <span className={`text-sm ${ehHoje ? 'font-bold' : ''}`}>{d.dia_da_semana}</span>
                  <span className={`text-sm font-bold text-right ${
                    ehHoje ? '' : ehOff ? 'text-[var(--sf-text-muted)]/60' : 'text-white'
                  }`}>
                    {ehOff ? 'Off' : labelDe(d.treino)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Aerobicos da semana */}
      {aerobicos_total > 0 && (
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}/aerobicos`)}
            className={`${CARD} w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-[var(--sf-surface-2)] transition-colors`}
          >
            <div className="w-11 h-11 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface)] flex items-center justify-center text-[#60A5FA] shrink-0">
              <Activity size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={LABEL} style={LABEL_STYLE}>Aerobicos da semana</p>
              <p className="text-white text-sm font-bold mt-0.5">
                {aerobicos_total} {aerobicos_total === 1 ? 'exercicio' : 'exercicios'}
              </p>
            </div>
            <ChevronRight size={18} className="text-[#60A5FA] shrink-0" />
          </button>
        </div>
      )}

      {/* Periodizacao */}
      {periodizacao.length > 0 && (
        <div className="px-4 mt-4">
          <div className={`${CARD} px-4 py-4`}>
            <p className={`${LABEL} mb-3`} style={LABEL_STYLE}>Periodizacao</p>
            <div>
              <div className="grid grid-cols-4 gap-2 px-3 pb-2 border-b border-[var(--sf-border)]">
                <span className="text-[#60A5FA] text-xs">Semana</span>
                <span className="text-[#60A5FA] text-xs">Series</span>
                <span className="text-[#60A5FA] text-xs">Reps</span>
                <span className="text-[#60A5FA] text-xs">Descanso</span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {periodizacao.map((p, i) => {
                  const ehAtual = p.atual === true
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-4 gap-2 px-3 py-2.5 rounded-lg ${
                        ehAtual
                          ? 'bg-[var(--sf-surface-2)] border border-[#2563EB] text-[#60A5FA]'
                          : 'text-gray-300'
                      }`}
                    >
                      <span className={`text-sm ${ehAtual ? 'font-bold' : ''}`}>{p.semana}</span>
                      <span className="text-sm">{p.series ?? '-'}</span>
                      <span className="text-sm">{p.repeticoes || '-'}</span>
                      <span className="text-sm leading-tight">{p.descanso || '-'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {periodizacao.find(p => p.atual)?.legenda && (
              <p className="text-[var(--sf-text-muted)] text-[11px] mt-3 leading-relaxed">
                {periodizacao.find(p => p.atual).legenda}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Treinos disponiveis */}
      {treinosDisponiveis.length > 0 && (
        <div className="px-4 mt-6">
          <p className={`${LABEL} mb-3 px-1`} style={LABEL_STYLE}>Treinos disponiveis</p>
          <div className="flex flex-col gap-3">
            {treinosDisponiveis.map(tId => {
              const execs = execucoes_por_treino?.[tId] || 0
              // Conta exercicios cadastrados a partir de execucoes_por_treino? Backend
              // poderia mandar essa info — por ora, mostro apenas a contagem de execucoes.
              return (
                <div key={tId} className={`${CARD} px-4 py-3.5`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-white text-base font-bold truncate">{labelDe(tId)}</p>
                      <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">{tId}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      {execs}x
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(tId)}?modo=ver`)}
                      className="h-9 rounded-lg border border-[var(--sf-border-strong)] bg-[var(--sf-surface)] text-[#60A5FA] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--sf-surface-2)] transition-colors"
                    >
                      <Eye size={13} /> Ver treino
                    </button>
                    <button
                      onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(tId)}`)}
                      className="h-9 rounded-lg bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#1D4ED8] transition-colors"
                    >
                      <Play size={13} className="fill-white" /> Iniciar treino
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
