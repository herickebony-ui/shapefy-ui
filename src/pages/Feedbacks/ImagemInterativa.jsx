import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Maximize2, X } from 'lucide-react'
import { heicUrlToObjectUrl } from '../../utils/heicToJpeg'
import useAuthSrc from '../../hooks/useAuthSrc'

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt="Fullscreen"
        draggable={false}
        onClick={e => e.stopPropagation()}
        className="max-h-screen max-w-full object-contain select-none"
      />
    </div>
  )
}

export default function ImagemInterativa({ src, feedbackId, idx, onRotate, readonly = false, extraActions }) {
  const authSrc = useAuthSrc(src)
  const storageKey = `shapefy_img_${feedbackId}_${idx}`

  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) } catch { return null }
  }, [storageKey])

  const [scale, setScale] = useState(saved?.scale || 1)
  const [pos, setPos] = useState(saved?.pos || { x: 0, y: 0 })
  const [align, setAlign] = useState(saved?.align || 0)
  const [rotation, setRotation] = useState(saved?.rotation || 0)
  const [isDragging, setIsDragging] = useState(false)
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 })

  const [imgLoading, setImgLoading] = useState(true)
  const [imgError, setImgError] = useState(false)
  const [heicSrc, setHeicSrc] = useState(null) // fallback: HEIC antigo decodificado no cliente
  const [fullscreen, setFullscreen] = useState(false)

  const isDirty = scale !== 1 || pos.x !== 0 || pos.y !== 0 || align !== 0 || rotation !== 0

  useEffect(() => {
    const t = setTimeout(() => {
      if (isDirty) {
        localStorage.setItem(storageKey, JSON.stringify({ scale, pos, align, rotation }))
      }
    }, 500)
    return () => clearTimeout(t)
  }, [scale, pos, align, rotation, storageKey, isDirty])

  const handleVirar = () => {
    setRotation(r => (r + 90) % 360)
    // tenta persistir no servidor em background, sem bloquear o visual
    onRotate?.()
  }

  const reset = () => {
    setScale(1); setPos({ x: 0, y: 0 }); setAlign(0); setRotation(0)
    localStorage.removeItem(storageKey)
  }

  // Mouse
  const handleMouseDown = (e) => {
    if (readonly) return
    setIsDragging(true)
    setStartDrag({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }
  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPos({ x: e.clientX - startDrag.x, y: e.clientY - startDrag.y })
  }
  const handleMouseUp = () => setIsDragging(false)

  // Touch
  const handleTouchStart = (e) => {
    if (readonly) return
    const t = e.touches[0]
    setIsDragging(true)
    setStartDrag({ x: t.clientX - pos.x, y: t.clientY - pos.y })
  }
  const handleTouchMove = (e) => {
    if (!isDragging) return
    const t = e.touches[0]
    setPos({ x: t.clientX - startDrag.x, y: t.clientY - startDrag.y })
  }
  const handleTouchEnd = () => setIsDragging(false)

  const activeSrc = heicSrc || authSrc

  return (
    <div className="flex flex-col items-center gap-0 w-full">
      {fullscreen && activeSrc && <Lightbox src={activeSrc} onClose={() => setFullscreen(false)} />}
      {!readonly && (
        <div className="flex flex-col w-full gap-3 px-1 bg-[#222226]/60 p-3 rounded-lg border border-[#323238]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleVirar}
                className="text-[10px] flex items-center gap-1 bg-[#29292e] px-3 py-1.5 rounded-lg border border-[#323238] hover:border-[#2563eb] text-white transition-all shrink-0 font-bold"
              >
                <RefreshCw size={10} /> Virar 90°
              </button>
              <button
                onClick={() => setFullscreen(true)}
                title="Ver em tela cheia"
                className="text-[10px] flex items-center gap-1 bg-[#29292e] px-3 py-1.5 rounded-lg border border-[#323238] hover:border-[#2563eb] text-white transition-all shrink-0 font-bold"
              >
                <Maximize2 size={10} /> Tela cheia
              </button>
              {extraActions}
            </div>
            {isDirty && (
              <button
                onClick={reset}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1.5 rounded-lg font-bold"
              >
                Resetar
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <span className="text-[9px] text-gray-500 uppercase font-bold flex justify-between">
                Zoom <span>{scale.toFixed(2)}x</span>
              </span>
              <input
                type="range" min="0.5" max="3" step="0.01" value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-[#2563eb] h-1 bg-[#323238] rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <span className="text-[9px] text-gray-500 uppercase font-bold flex justify-between">
                Alinhar <span>{align}°</span>
              </span>
              <input
                type="range" min="-45" max="45" step="0.5" value={align}
                onChange={(e) => setAlign(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-[#323238] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden flex justify-center items-center bg-black/20 rounded-none p-0 h-[90vw] md:h-[400px] w-full relative group"
        style={{ cursor: isDragging ? 'grabbing' : (readonly ? 'default' : 'grab') }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imgLoading && !imgError && (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-[10px]">Carregando foto...</span>
          </div>
        )}
        {imgError && (
          <span className="text-[10px] text-red-500 italic">Erro ao carregar imagem</span>
        )}
        {src && (
          <img
            src={activeSrc}
            alt="Feedback"
            draggable={false}
            className="max-h-full max-w-full object-contain"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation + align}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              display: imgError ? 'none' : 'block',
            }}
            onLoad={() => setImgLoading(false)}
            onError={async () => {
              // Fallback: HEIC antigo que o navegador não decodifica — tenta converter no cliente.
              if (!heicSrc) {
                const obj = await heicUrlToObjectUrl(authSrc)
                if (obj) { setHeicSrc(obj); setImgLoading(true); return }
              }
              setImgLoading(false); setImgError(true)
            }}
          />
        )}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-lg pointer-events-none transition-colors" />
        {!imgError && !imgLoading && activeSrc && (
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(true) }}
            title="Ver em tela cheia"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>
      {!readonly && (
        <span className="text-[9px] text-gray-600 text-center w-full mt-1">
          Clique e arraste para reposicionar
        </span>
      )}
    </div>
  )
}
