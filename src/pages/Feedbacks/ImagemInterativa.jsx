import { useState, useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'

export default function ImagemInterativa({ src, feedbackId, idx, onRotate, readonly = false }) {
  const storageKey = `shapefy_img_${feedbackId}_${idx}`

  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) } catch { return null }
  }, [storageKey])

  const [scale, setScale] = useState(saved?.scale || 1)
  const [pos, setPos] = useState(saved?.pos || { x: 0, y: 0 })
  const [align, setAlign] = useState(saved?.align || 0)
  const [isDragging, setIsDragging] = useState(false)
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 })

  const [imgLoading, setImgLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  const isDirty = scale !== 1 || pos.x !== 0 || pos.y !== 0 || align !== 0

  useEffect(() => {
    const t = setTimeout(() => {
      if (isDirty) {
        localStorage.setItem(storageKey, JSON.stringify({ scale, pos, align }))
      }
    }, 500)
    return () => clearTimeout(t)
  }, [scale, pos, align, storageKey, isDirty])

  const reset = () => {
    setScale(1); setPos({ x: 0, y: 0 }); setAlign(0)
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

  return (
    <div className="flex flex-col items-center gap-0 w-full">
      {!readonly && (
        <div className="flex flex-col w-full gap-3 px-1 bg-[#222226]/60 p-3 rounded-lg border border-[#323238]">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={onRotate}
              className="text-[10px] flex items-center gap-1 bg-[#29292e] px-3 py-1.5 rounded-lg border border-[#323238] hover:border-[#850000] text-white transition-all shrink-0 font-bold"
            >
              <RefreshCw size={10} /> Virar 90°
            </button>
            {isDirty && (
              <button
                onClick={reset}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1.5 rounded-lg font-bold"
              >
                Resetar
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 w-full">
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[9px] text-gray-500 uppercase font-bold flex justify-between">
                Zoom <span>{scale.toFixed(2)}x</span>
              </span>
              <input
                type="range" min="0.5" max="3" step="0.01" value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-[#850000] h-1 bg-[#323238] rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
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
            src={src}
            alt="Feedback"
            draggable={false}
            className="max-h-full max-w-full object-contain"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${align}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              display: imgError ? 'none' : 'block',
            }}
            onLoad={() => setImgLoading(false)}
            onError={() => { setImgLoading(false); setImgError(true) }}
          />
        )}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-lg pointer-events-none transition-colors" />
      </div>
      {!readonly && (
        <span className="text-[9px] text-gray-600 text-center w-full mt-1">
          Clique e arraste para reposicionar
        </span>
      )}
    </div>
  )
}
