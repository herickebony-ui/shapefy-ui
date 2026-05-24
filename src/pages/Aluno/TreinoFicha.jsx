import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, Play, Eye, History, AlertCircle, Moon,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { buscarFichaTreino } from '../../api/treino'

// Paleta azul-navy escuro pra alinhar com a estetica das telas atuais (Frappe).
// Substituimos o gradient preto do AlunoCard por um tom azul profundo (#0d2042).
const CARD = 'bg-[#0d2042] border border-[#1c3661] rounded-2xl'
const CARD_DESTAQUE = 'bg-[#16306a] border border-[#2563eb]/60 rounded-2xl shadow-[0_0_24px_rgba(37,99,235,0.18)]'
const LABEL = 'text-[#60a5fa] text-[10px] font-bold uppercase tracking-widest'

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
      <div className="min-h-full bg-[#08152e] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="pb-8 bg-[#08152e] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate('/aluno/treinos')}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#1c3661] text-gray-300 hover:text-white hover:border-[#2563eb] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-5 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-[#60a5fa] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-sm leading-relaxed">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dados) return null

  const {
    ficha, dias_da_semana = [], treino_do_dia, ultimo_treino,
    periodizacao = [], execucoes_por_treino = {},
  } = dados
  const treinoDoDiaEhOff = !treino_do_dia || treino_do_dia === 'Off'

  return (
    <div className="pb-10 bg-[#08152e] min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[#13294e]">
        <button
          onClick={() => navigate('/aluno/treinos')}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[#13294e] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
          Ficha de Treino
        </h1>
      </div>

      {/* Card geral: ciclo + periodo */}
      <div className="px-4 mt-4">
        <div className={`${CARD} px-4 py-4`}>
          {ficha?.tipo_de_ciclo && (
            <>
              <p className={LABEL}>Ciclo</p>
              <p className="text-white text-sm mt-1">{ficha.tipo_de_ciclo}</p>
            </>
          )}
          <p className={`${LABEL} ${ficha?.tipo_de_ciclo ? 'mt-3' : ''}`}>Periodo</p>
          <p className="text-white text-sm mt-1">
            {fmtDataExtenso(ficha?.data_de_inicio)} ate {fmtDataExtenso(ficha?.data_de_fim)}
          </p>
        </div>
      </div>

      {/* Treino do dia */}
      {!treinoDoDiaEhOff && (
        <div className="px-4 mt-3">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(treino_do_dia)}`)}
            className={`${CARD_DESTAQUE} w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-[#1a387a] transition-colors`}
          >
            <div className="w-11 h-11 rounded-xl bg-[#2563eb] flex items-center justify-center shrink-0">
              <Play size={18} className="text-white fill-white ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#2563eb] text-white text-[9px] font-bold uppercase tracking-widest">
                  Hoje
                </span>
                <span className="text-[#60a5fa] text-[10px] font-bold uppercase tracking-widest">
                  {treino_do_dia}
                </span>
              </div>
              <p className="text-white text-sm font-bold mt-1.5 truncate">
                {labelDe(treino_do_dia)}
              </p>
            </div>
            <ChevronRight size={18} className="text-[#60a5fa] shrink-0" />
          </button>
        </div>
      )}

      {treinoDoDiaEhOff && (
        <div className="px-4 mt-3">
          <div className={`${CARD} px-4 py-4 flex items-center gap-3`}>
            <div className="w-11 h-11 rounded-xl border border-[#1c3661] bg-[#0a1a35] flex items-center justify-center text-gray-400 shrink-0">
              <Moon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">Hoje e dia de descanso</p>
              <p className="text-[#8ba6c8] text-xs mt-0.5">Aproveite pra recuperar bem.</p>
            </div>
          </div>
        </div>
      )}

      {/* Ultimo treino */}
      {ultimo_treino?.treino && (
        <div className="px-4 mt-3">
          <div className={`${CARD} px-4 py-3 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-lg border border-[#1c3661] bg-[#0a1a35] flex items-center justify-center text-[#60a5fa] shrink-0">
              <History size={14} />
            </div>
            <div className="min-w-0">
              <p className={LABEL}>Ultimo treino</p>
              <p className="text-white text-xs font-bold mt-0.5 truncate">
                {ultimo_treino.treino_label || ultimo_treino.treino}
              </p>
              <p className="text-[#8ba6c8] text-[11px] mt-0.5">{fmtDataHoraBR(ultimo_treino.data_e_hora_do_inicio)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Distribuicao semanal */}
      <div className="px-4 mt-4">
        <div className={`${CARD} px-4 py-4`}>
          <p className={`${LABEL} mb-3`}>Distribuicao semanal</p>
          <div className="flex flex-col">
            {dias_da_semana.map((d, i) => {
              const ehOff = !d.treino || d.treino === 'Off'
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2.5 ${
                    i < dias_da_semana.length - 1 ? 'border-b border-[#13294e]' : ''
                  }`}
                >
                  <span className="text-gray-300 text-sm">{d.dia_da_semana}</span>
                  <span className={`text-sm font-bold text-right ${ehOff ? 'text-[#8ba6c8]/60' : 'text-white'}`}>
                    {ehOff ? 'Off' : labelDe(d.treino)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Periodizacao */}
      {periodizacao.length > 0 && (
        <div className="px-4 mt-4">
          <div className={`${CARD} px-4 py-4`}>
            <p className={`${LABEL} mb-3`}>Periodizacao</p>
            <div>
              <div className="grid grid-cols-4 gap-2 px-3 pb-2 border-b border-[#13294e]">
                <span className="text-[#60a5fa] text-xs">Semana</span>
                <span className="text-[#60a5fa] text-xs">Series</span>
                <span className="text-[#60a5fa] text-xs">Reps</span>
                <span className="text-[#60a5fa] text-xs">Descanso</span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {periodizacao.map((p, i) => {
                  const ehAtual = p.atual === true
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-4 gap-2 px-3 py-2.5 rounded-lg ${
                        ehAtual
                          ? 'bg-[#0a2956] border border-[#2563eb] text-[#60a5fa]'
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
              <p className="text-[#8ba6c8] text-[11px] mt-3 leading-relaxed">
                {periodizacao.find(p => p.atual).legenda}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Treinos disponiveis */}
      {treinosDisponiveis.length > 0 && (
        <div className="px-4 mt-6">
          <p className={`${LABEL} mb-3 px-1`}>Treinos disponiveis</p>
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
                      <p className="text-[#8ba6c8] text-[11px] mt-0.5">{tId}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      {execs}x
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(tId)}?modo=ver`)}
                      className="h-9 rounded-lg border border-[#2563eb]/40 bg-[#0a1a35] text-[#60a5fa] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#13294e] transition-colors"
                    >
                      <Eye size={13} /> Ver treino
                    </button>
                    <button
                      onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(tId)}`)}
                      className="h-9 rounded-lg bg-[#2563eb] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#1d4ed8] transition-colors"
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

      {/* Orientacoes gerais */}
      {ficha?.orientacoes && (
        <div className="px-4 mt-6">
          <div className={`${CARD} px-4 py-4`}>
            <p className={`${LABEL} mb-2`}>Orientacoes</p>
            <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
              {ficha.orientacoes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
