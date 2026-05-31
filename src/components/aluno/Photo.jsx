import { useState } from 'react'
import { ImageOff, X } from 'lucide-react'

// Foto de avaliação com placeholder p/ null e lightbox (toque amplia em tela cheia).
// As URLs do backend são públicas — <img src> direto.
export default function Photo({ url, label, caption, ratio = 'aspect-[3/4]', className = '' }) {
  const [aberto, setAberto] = useState(false)

  if (!url) {
    return (
      <div className={`${ratio} ${className} rounded-xl bg-[var(--sf-surface-2)] border border-dashed border-[var(--sf-border)] flex flex-col items-center justify-center gap-1`}>
        <ImageOff size={18} className="text-[var(--sf-text-soft)]" />
        {caption && <span className="text-[var(--sf-text-soft)] text-[10px]">{caption}</span>}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`${ratio} ${className} rounded-xl overflow-hidden border border-[var(--sf-border)] block w-full`}
      >
        <img src={url} alt={label || 'Foto'} loading="lazy" className="h-full w-full object-cover" />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAberto(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            onClick={() => setAberto(false)}
          >
            <X size={20} />
          </button>
          {label && (
            <span className="absolute top-5 left-4 text-white text-sm font-bold" style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}>
              {label}
            </span>
          )}
          <img src={url} alt={label || 'Foto'} className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
    </>
  )
}
