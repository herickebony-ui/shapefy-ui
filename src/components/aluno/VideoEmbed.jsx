import { useState } from 'react'
import { Play, X } from 'lucide-react'

// VideoEmbed — thumbnail click vira iframe inline (YouTube, Vimeo, Google Drive).
// Mesma experiência usada na ficha de treino (execução): o vídeo abre e toca
// DENTRO do app. `id` é o código do vídeo; `plataforma` é "YouTube"/"Vimeo"/"Drive".

const getYouTubeEmbed = (id) => `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&modestbranding=1`
const getVimeoEmbed = (id) => `https://player.vimeo.com/video/${id}?autoplay=1`
const getDriveEmbed = (id) => `https://drive.google.com/file/d/${id}/preview`
const getYouTubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

export default function VideoEmbed({ id, plataforma }) {
  const [aberto, setAberto] = useState(false)
  const [modalCheio, setModalCheio] = useState(false)
  if (!id) return null
  const plat = (plataforma || 'YouTube').toLowerCase()
  const ehDrive = plat.includes('drive')
  const ehVimeo = plat.includes('vimeo')

  // Drive: player embarcado e limitado. Abrimos em modal verdadeiramente fullscreen
  // (iframe ocupa 100% da viewport) com so um botao flutuante de fechar.
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
