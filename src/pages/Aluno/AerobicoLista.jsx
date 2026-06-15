import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, Activity, Info, Check, X, Play, Calendar,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import {
  GlassCard, SectionHeader, AlertCard, StatusPill, ActionButton,
} from '../../components/aluno'
import {
  listarAerobicos, marcarAerobico, desmarcarAerobico,
} from '../../api/treino'

// ============================================================
// VideoEmbed local — espelha o comportamento da tela de execucao:
// YT/Vimeo: thumbnail click vira iframe inline; Drive: fullscreen modal.
// ============================================================

const getYouTubeEmbed = (id) => `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&modestbranding=1`
const getVimeoEmbed = (id) => `https://player.vimeo.com/video/${id}?autoplay=1`
const getDriveEmbed = (id) => `https://drive.google.com/file/d/${id}/preview`
const getYouTubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

function VideoEmbed({ id, plataforma }) {
  const [aberto, setAberto] = useState(false)
  const [modalCheio, setModalCheio] = useState(false)
  if (!id) return null
  const plat = (plataforma || 'YouTube').toLowerCase()
  const ehDrive = plat.includes('drive')
  const ehVimeo = plat.includes('vimeo')

  if (ehDrive) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalCheio(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-gradient-to-br from-[var(--sf-surface-2)] to-[var(--sf-bg)] group flex items-center justify-center"
        >
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest text-[#60A5FA] bg-black/60 px-2 py-0.5 rounded">
            Google Drive
          </span>
          <div className="h-14 w-14 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_0_28px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
            <Play size={22} className="text-white fill-white ml-0.5" />
          </div>
          <span className="absolute bottom-2 text-[10px] text-[var(--sf-text-muted)]">
            Toque para ver em tela cheia
          </span>
        </button>
        {modalCheio && (
          <div className="fixed inset-0 z-[200] bg-black">
            <iframe
              src={getDriveEmbed(id)}
              title="Video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
            <button
              onClick={() => setModalCheio(false)}
              className="fixed top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/70 backdrop-blur text-white border border-white/20 hover:bg-black/90 transition-colors shadow-lg"
              style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </>
    )
  }

  if (aberto) {
    const src = ehVimeo ? getVimeoEmbed(id) : getYouTubeEmbed(id)
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black">
        <iframe
          src={src}
          title="Video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black group"
    >
      {ehVimeo ? (
        <div className="w-full h-full bg-gradient-to-br from-[var(--sf-surface-2)] to-[var(--sf-bg)] flex items-center justify-center">
          <span className="text-[#60A5FA] text-xs uppercase tracking-widest font-bold">Vimeo</span>
        </div>
      ) : (
        <img
          src={getYouTubeThumb(id)}
          alt="Thumbnail"
          loading="lazy"
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_0_28px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
          <Play size={22} className="text-white fill-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

// ============================================================
// AerobicoCard
// ============================================================

function AerobicoCard({ aerobico, onMarcar, onDesmarcar, salvando }) {
  const isOpcional = aerobico.status === 'opcional'
  const isConcluido = aerobico.status === 'concluido'
  const alvo = aerobico.frequencia_alvo || 0
  const feitos = aerobico.sessoes_marcadas || 0
  const pct = Math.min(100, Math.max(0, aerobico.pct || 0))
  const marcacoes = aerobico.marcacoes || []

  const variant = isConcluido ? 'success' : 'default'

  return (
    <GlassCard as="div" variant={variant} className="px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-sm font-bold uppercase tracking-wider leading-snug flex-1 min-w-0">
          {aerobico.exercicios || 'Aerobico'}
        </p>
        {isConcluido ? (
          <StatusPill variant="success">Concluido</StatusPill>
        ) : isOpcional ? (
          <StatusPill variant="muted">Opcional</StatusPill>
        ) : (
          <StatusPill variant="info">Pendente</StatusPill>
        )}
      </div>

      {aerobico.frequencia && (
        <div className="mt-3">
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase tracking-widest">Frequencia</p>
          <p className="text-white text-xs mt-0.5">{aerobico.frequencia}</p>
        </div>
      )}

      {aerobico.instrucao && (
        <div className="mt-3">
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase tracking-widest">Instrucao</p>
          <p className="text-[var(--sf-text-muted)] text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">
            {aerobico.instrucao}
          </p>
        </div>
      )}

      {aerobico.video && (
        <div className="mt-3">
          <VideoEmbed id={aerobico.video} plataforma={aerobico.plataforma_do_video} />
        </div>
      )}

      {!isOpcional && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--sf-surface-2)] border border-[var(--sf-border)]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-white text-2xl font-bold tabular-nums">
              {feitos} <span className="text-[var(--sf-text-muted)] text-base">/ {alvo}</span>
            </span>
            <span className="text-[#60A5FA] text-[10px] font-bold uppercase tracking-widest">
              Sessoes esta semana
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[var(--sf-bg)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {marcacoes.length > 0 && (
        <div className="mt-3">
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase tracking-widest mb-1.5">
            Marcacoes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {marcacoes.map((m) => (
              <span
                key={m.name}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[rgba(37,99,235,0.15)] border border-[rgba(59,130,246,0.40)] text-[#60A5FA] text-[11px] font-medium"
              >
                <Calendar size={10} />
                <span>{m.label}</span>
                <button
                  onClick={() => onDesmarcar(m.name)}
                  disabled={salvando}
                  title="Desmarcar"
                  className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-[rgba(239,68,68,0.20)] hover:text-[#F87171] transition-colors disabled:opacity-50"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <ActionButton
          variant="success"
          fullWidth
          icon={Check}
          loading={salvando}
          onClick={onMarcar}
        >
          Concluir aerobico
        </ActionButton>
      </div>
    </GlassCard>
  )
}

// ============================================================
// Main
// ============================================================

export default function AerobicoLista() {
  const { fichaName } = useParams()
  const navigate = useNavigate()
  const [aerobicos, setAerobicos] = useState([])
  const [semanaIso, setSemanaIso] = useState(null)
  const [orientacoes, setOrientacoes] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  // id do aerobico que esta sendo salvo (pra mostrar loading no botao certo)
  const [salvandoId, setSalvandoId] = useState(null)

  const carregar = async () => {
    try {
      const res = await listarAerobicos(fichaName)
      setAerobicos(res?.aerobicos || [])
      setSemanaIso(res?.semana_iso || null)
      setOrientacoes(res?.orientacoes_aerobicos || '')
    } catch (err) {
      console.error('Falha ao listar aerobicos:', err)
      setErro(err.response?.status === 403
        ? 'Voce nao tem permissao para acessar os aerobicos.'
        : 'Nao foi possivel carregar os aerobicos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    listarAerobicos(fichaName)
      .then(res => {
        if (cancelado) return
        setAerobicos(res?.aerobicos || [])
        setSemanaIso(res?.semana_iso || null)
        setOrientacoes(res?.orientacoes_aerobicos || '')
      })
      .catch(err => {
        if (cancelado) return
        console.error('Falha ao listar aerobicos:', err)
        setErro(err.response?.status === 403
          ? 'Voce nao tem permissao para acessar os aerobicos.'
          : 'Nao foi possivel carregar os aerobicos. Tente novamente.')
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [fichaName])

  const handleMarcar = async (aerobicoId) => {
    setSalvandoId(aerobicoId)
    try {
      const atualizado = await marcarAerobico(fichaName, aerobicoId)
      if (atualizado) {
        setAerobicos(prev => prev.map(a => a.name === aerobicoId ? { ...a, ...atualizado } : a))
      } else {
        await carregar()
      }
    } catch (err) {
      console.error('Falha ao marcar aerobico:', err)
      alert('Nao foi possivel registrar o aerobico. Tente novamente.')
    } finally {
      setSalvandoId(null)
    }
  }

  const handleDesmarcar = async (aerobicoId, marcacaoId) => {
    setSalvandoId(aerobicoId)
    try {
      const atualizado = await desmarcarAerobico(fichaName, aerobicoId, marcacaoId)
      if (atualizado) {
        setAerobicos(prev => prev.map(a => a.name === aerobicoId ? { ...a, ...atualizado } : a))
      } else {
        await carregar()
      }
    } catch (err) {
      console.error('Falha ao desmarcar aerobico:', err)
      alert('Nao foi possivel desmarcar. Tente novamente.')
    } finally {
      setSalvandoId(null)
    }
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-white text-base font-bold leading-tight">Aerobicos da semana</h1>
          {semanaIso && (
            <p className="text-[var(--sf-text-muted)] text-[11px]">Semana {semanaIso}</p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader icon={<Activity size={15} />} label="Meus aerobicos" />

        {carregando ? (
          <div className="h-40 flex items-center justify-center"><Spinner /></div>
        ) : erro ? (
          <AlertCard variant="danger" titulo={erro} icon={<AlertCircle size={18} />} />
        ) : aerobicos.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Activity size={32} className="text-[var(--sf-text-soft)] mb-3" />
            <p className="text-white text-sm font-bold">Nenhum aerobico</p>
            <p className="text-[var(--sf-text-muted)] text-xs mt-1 max-w-xs">
              Sua ficha nao tem aerobicos cadastrados. Fale com o seu profissional.
            </p>
          </GlassCard>
        ) : (
          <>
            {orientacoes && (
              <div className="mb-3">
                <GlassCard as="div" className="px-4 py-3">
                  <p
                    className="text-[#60A5FA] text-[11px] font-bold uppercase"
                    style={{ letterSpacing: '0.18em' }}
                  >
                    Orientacoes
                  </p>
                  <p className="text-gray-200 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {orientacoes}
                  </p>
                </GlassCard>
              </div>
            )}

            <div className="mb-3">
              <AlertCard
                variant="info"
                titulo="A cada aerobico que voce fizer, toque em Concluir aerobico."
                descricao="O contador zera toda segunda-feira."
                icon={<Info size={18} />}
              />
            </div>

            <div className="flex flex-col gap-3">
              {aerobicos.map(a => (
                <AerobicoCard
                  key={a.name}
                  aerobico={a}
                  salvando={salvandoId === a.name}
                  onMarcar={() => handleMarcar(a.name)}
                  onDesmarcar={(marcacaoId) => handleDesmarcar(a.name, marcacaoId)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
