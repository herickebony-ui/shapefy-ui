import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, ArrowLeft, Calendar, ChevronRight, AlertCircle, Target, BarChart3,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, AlertCard } from '../../components/aluno'
import { listarTreinos } from '../../api/treino'

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
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Meus treinos</h1>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader
          icon={<Dumbbell size={15} />}
          label="Minhas fichas"
        />

        {carregando ? (
          <div className="h-40 flex items-center justify-center"><Spinner /></div>
        ) : erro ? (
          <AlertCard variant="danger" titulo={erro} icon={<AlertCircle size={18} />} />
        ) : fichas.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Dumbbell size={32} className="text-[var(--sf-text-soft)] mb-3" />
            <p className="text-white text-sm font-bold">Nenhuma ficha ativa</p>
            <p className="text-[var(--sf-text-muted)] text-xs mt-1 max-w-xs">
              Voce nao tem fichas de treino ativas no momento. Fale com o seu profissional.
            </p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {fichas.map(f => (
              <GlassCard
                key={f.name}
                as="button"
                onClick={() => navigate(`/aluno/treinos/${f.name}`)}
                className="px-4 py-4 flex items-start gap-3"
              >
                <div className="w-11 h-11 rounded-xl border border-[var(--sf-border-strong)] bg-[var(--sf-surface-2)] flex items-center justify-center text-[#60A5FA] shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.25)]">
                  <Dumbbell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">
                    {f.nome_completo || `Ficha ${f.name}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                    <span className="flex items-center gap-1 text-[var(--sf-text-muted)]">
                      <Calendar size={11} />
                      {fmtDataBR(f.data_de_inicio)} - {fmtDataBR(f.data_de_fim)}
                    </span>
                    {f.nivel && (
                      <span className="flex items-center gap-1 text-[var(--sf-text-muted)]">
                        <BarChart3 size={11} />
                        {f.nivel}
                      </span>
                    )}
                    {f.objetivo && (
                      <span className="flex items-center gap-1 text-[var(--sf-text-muted)] truncate max-w-[160px]">
                        <Target size={11} />
                        <span className="truncate">{f.objetivo}</span>
                      </span>
                    )}
                  </div>
                  {f.dias_info && (
                    <p className="text-[#60A5FA] text-[11px] font-bold mt-2">{f.dias_info}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[var(--sf-text-soft)] shrink-0 mt-1" />
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
