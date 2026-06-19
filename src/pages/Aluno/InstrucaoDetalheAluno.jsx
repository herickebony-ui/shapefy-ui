import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, AlertCircle, FileText, ExternalLink } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, AlertCard, VideoEmbed } from '../../components/aluno'
import { buscarInstrucaoDetalheAluno } from '../../api/aluno'
import { extractVideoId } from '../../utils/video'

const BASE = import.meta.env.VITE_FRAPPE_URL || ''

// ─── Detecção de vídeo (URL → id + plataforma p/ o VideoEmbed da ficha) ───────

const detectVideo = (url) => {
  const drive = String(url || '').match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/i)
  if (drive) return { id: drive[1], plataforma: 'Drive' }
  const { id, plataforma } = extractVideoId(url)
  if (plataforma === 'YouTube' || plataforma === 'Vimeo') return { id, plataforma }
  return { id: null, plataforma: null }
}

// ─── Renderização de um bloco ─────────────────────────────────────────────────

const RenderTexto = ({ texto }) => {
  const linhas = String(texto || '').split('\n')
  const out = []
  let bullets = []
  const flush = (k) => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${k}`} className="list-disc pl-5 space-y-1">
          {bullets.map((b, i) => <li key={i} className="text-[var(--sf-text)] text-sm leading-relaxed">{b}</li>)}
        </ul>
      )
      bullets = []
    }
  }
  linhas.forEach((l, i) => {
    const t = l.trim()
    if (t.startsWith('- ') || t.startsWith('• ')) {
      bullets.push(t.slice(2))
    } else {
      flush(i)
      if (t) out.push(<p key={i} className="text-[var(--sf-text)] text-sm leading-relaxed">{t}</p>)
    }
  })
  flush('end')
  return <div className="space-y-1.5">{out}</div>
}

const Bloco = ({ bloco }) => {
  if (bloco.tipo === 'topico') {
    return <h2 className="text-white font-bold text-lg">{bloco.texto}</h2>
  }

  if (bloco.tipo === 'titulo') {
    return <h3 className="text-white font-semibold text-base">{bloco.texto}</h3>
  }

  if (bloco.tipo === 'texto') {
    return <RenderTexto texto={bloco.texto} />
  }

  if (bloco.tipo === 'video') {
    const { id, plataforma } = detectVideo(bloco.url)
    if (!id) {
      return (
        <a href={bloco.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-[var(--sf-surface-2)] border border-[var(--sf-border)] text-white text-sm">
          Abrir vídeo <ExternalLink size={14} />
        </a>
      )
    }
    return <VideoEmbed id={id} plataforma={plataforma} />
  }

  if (bloco.tipo === 'pdf') {
    if (!bloco.file_url) return null
    return (
      <a href={`${BASE}${encodeURI(bloco.file_url)}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-3 px-4 h-12 rounded-xl bg-[var(--sf-surface-2)] border border-[var(--sf-border)] text-white text-sm hover:border-[var(--sf-blue)] transition-colors">
        <FileText size={16} className="text-[var(--sf-blue-light)] shrink-0" />
        <span className="flex-1 truncate">{bloco.label || 'Abrir PDF'}</span>
        <ExternalLink size={14} className="text-gray-400 shrink-0" />
      </a>
    )
  }

  if (bloco.tipo === 'imagem') {
    if (!bloco.file_url) return null
    return (
      <figure>
        <img src={`${BASE}${encodeURI(bloco.file_url)}`} alt={bloco.legenda || ''}
          className="w-full rounded-xl border border-[var(--sf-border)]" />
        {bloco.legenda && (
          <figcaption className="text-[var(--sf-text-muted)] text-xs mt-1.5 text-center">{bloco.legenda}</figcaption>
        )}
      </figure>
    )
  }

  return null
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function InstrucaoDetalheAluno() {
  const navigate = useNavigate()
  const { name } = useParams()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [instrucao, setInstrucao] = useState(null)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    buscarInstrucaoDetalheAluno(name)
      .then((data) => { if (vivo) setInstrucao(data) })
      .catch((e) => { if (vivo) setErro(e?.message || 'Erro ao carregar instrução') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [name])

  const blocos = instrucao?.blocos || []

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/instrucoes')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold truncate">{instrucao?.titulo || 'Instrução'}</h1>
      </div>

      <div className="px-4 pt-4">
        {carregando ? (
          <div className="h-40 flex items-center justify-center"><Spinner /></div>
        ) : erro ? (
          <AlertCard variant="danger" titulo={erro} icon={<AlertCircle size={18} />} />
        ) : !instrucao ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <BookOpen size={26} className="text-[var(--sf-text-muted)] mb-2" />
            <p className="text-[var(--sf-text-soft)] text-sm">Instrução não disponível.</p>
          </GlassCard>
        ) : (
          <>
            <SectionHeader icon={<BookOpen size={15} />} label={instrucao.titulo || 'Instrução'} />
            <GlassCard as="div" className="px-4 py-2">
              {blocos.length === 0 ? (
                <p className="text-[var(--sf-text-muted)] text-sm py-2">Sem conteúdo.</p>
              ) : (
                <div className="divide-y divide-[var(--sf-border-strong)]">
                  {blocos.map((b, i) => (
                    <div key={i} className="py-3.5">
                      <Bloco bloco={b} />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </div>
  )
}
