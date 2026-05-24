import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, ArrowLeft, Calendar, ChevronRight, AlertCircle, Target, BarChart3,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { listarTreinos } from '../../api/treino'

const CARD = 'bg-[#0d2042] border border-[#1c3661] rounded-2xl'
const CARD_DESTAQUE = 'bg-[#16306a] border border-[#2563eb]/60 rounded-2xl'
const LABEL = 'text-[#60a5fa] text-[10px] font-bold uppercase tracking-widest'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

export default function TreinoLista() {
  const navigate = useNavigate()
  const [fichas, setFichas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false
    listarTreinos()
      .then(res => { if (!cancelado) setFichas(res) })
      .catch(err => {
        if (cancelado) return
        if (err.response?.status === 403) {
          setErro('Voce nao tem permissao para acessar treinos. Fale com o seu profissional.')
        } else {
          console.error('Falha ao listar treinos:', err)
          setErro('Nao foi possivel carregar os treinos. Tente novamente em alguns instantes.')
        }
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [])

  return (
    <div className="pb-8 bg-[#08152e] min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[#13294e]">
        <button
          onClick={() => navigate('/aluno')}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[#13294e] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
          Meus treinos
        </h1>
      </div>

      <div className="px-4 mt-5">
        <p className={`${LABEL} mb-3 px-1`}>Minhas fichas</p>

        {carregando ? (
          <div className="h-40 flex items-center justify-center"><Spinner /></div>
        ) : erro ? (
          <div className={`${CARD_DESTAQUE} px-4 py-5 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-[#60a5fa] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-sm leading-relaxed">{erro}</p>
          </div>
        ) : fichas.length === 0 ? (
          <div className={`${CARD} px-4 py-8 flex flex-col items-center text-center`}>
            <Dumbbell size={32} className="text-[#5b7ba3] mb-3" />
            <p className="text-gray-200 text-sm font-bold">Nenhuma ficha ativa</p>
            <p className="text-[#8ba6c8] text-xs mt-1">
              Voce nao tem fichas de treino ativas no momento. Fale com o seu profissional.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fichas.map(f => (
              <button
                key={f.name}
                onClick={() => navigate(`/aluno/treinos/${f.name}`)}
                className={`${CARD} hover:border-[#2563eb] px-4 py-4 flex items-start gap-3 text-left transition-colors`}
              >
                <div className="w-11 h-11 rounded-xl border border-[#2563eb]/40 bg-[#0a2956] flex items-center justify-center text-[#60a5fa] shrink-0">
                  <Dumbbell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">
                    {f.nome_completo || `Ficha ${f.name}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                    <span className="flex items-center gap-1 text-[#8ba6c8]">
                      <Calendar size={11} />
                      {fmtDataBR(f.data_de_inicio)} - {fmtDataBR(f.data_de_fim)}
                    </span>
                    {f.nivel && (
                      <span className="flex items-center gap-1 text-[#8ba6c8]">
                        <BarChart3 size={11} />
                        {f.nivel}
                      </span>
                    )}
                    {f.objetivo && (
                      <span className="flex items-center gap-1 text-[#8ba6c8] truncate max-w-[160px]">
                        <Target size={11} />
                        <span className="truncate">{f.objetivo}</span>
                      </span>
                    )}
                  </div>
                  {f.dias_info && (
                    <p className="text-[#60a5fa] text-[11px] font-bold mt-2">{f.dias_info}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[#5b7ba3] shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
