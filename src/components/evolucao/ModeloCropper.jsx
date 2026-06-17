import { useRef } from 'react'
import { ZoomIn, Move, RotateCw } from 'lucide-react'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

export const DEFAULT_CROP = { x: 50, y: 50, zoom: 1, rot: 0 }

// Faz parse do JSON salvo ({x,y,zoom,rot}) com fallback seguro.
export function parseCrop(raw) {
  if (!raw) return { ...DEFAULT_CROP }
  if (typeof raw === 'object') return { ...DEFAULT_CROP, ...raw }
  try {
    const o = JSON.parse(raw)
    return { x: Number(o.x) || 50, y: Number(o.y) || 50, zoom: Number(o.zoom) || 1, rot: Number(o.rot) || 0 }
  } catch { return { ...DEFAULT_CROP } }
}

// Estilo do <img> pra refletir o enquadramento. object-position = foco (pan),
// scale = zoom, rotate = giro. Mesma função no editor e na exibição → WYSIWYG.
// O <img> precisa ser w-full h-full dentro de um container overflow-hidden.
export function cropImgStyle(raw) {
  const c = parseCrop(raw)
  return {
    width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: `${c.x}% ${c.y}%`,
    transform: `scale(${c.zoom}) rotate(${c.rot}deg)`,
    transformOrigin: 'center',
  }
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// Editor: arrasta pra mover o foco, slider/scroll pra dar zoom. crop = {x,y,zoom}.
export default function ModeloCropper({ url, crop, onChange }) {
  const c = parseCrop(crop)
  const boxRef = useRef(null)
  const drag = useRef(null)
  const src = url?.startsWith('http') ? url : `${FRAPPE_URL}${url}`

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current || !boxRef.current) return
    const box = boxRef.current.getBoundingClientRect()
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }
    // arrastar a imagem na direção do gesto → diminui object-position
    onChange({
      ...c,
      x: clamp(c.x - (dx / box.width) * 100, 0, 100),
      y: clamp(c.y - (dy / box.height) * 100, 0, 100),
    })
  }
  const onPointerUp = (e) => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId) }
  const onWheel = (e) => {
    e.preventDefault()
    onChange({ ...c, zoom: clamp(c.zoom + (e.deltaY < 0 ? 0.1 : -0.1), 1, 3) })
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#323238] bg-[#0a0a0a] cursor-move touch-none select-none"
      >
        <img src={src} alt="enquadramento" draggable={false} style={cropImgStyle(c)} />
        <span className="absolute top-1 left-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest bg-black/60 text-white px-1.5 py-0.5 rounded">
          <Move size={9} /> arraste
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ZoomIn size={13} className="text-gray-500 shrink-0" />
        <input
          type="range" min="1" max="3" step="0.05" value={c.zoom}
          onChange={(e) => onChange({ ...c, zoom: Number(e.target.value) })}
          className="flex-1 accent-[#2563eb] h-1"
        />
        <button
          type="button"
          onClick={() => onChange({ ...c, rot: ((c.rot || 0) + 90) % 360 })}
          title="Girar 90°"
          className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-blue-500 rounded transition-colors shrink-0"
        >
          <RotateCw size={11} />
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CROP })}
          className="text-[10px] text-gray-500 hover:text-white shrink-0"
        >
          resetar
        </button>
      </div>
    </div>
  )
}
