import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Images, Pencil, Check, Maximize2, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner, Button } from '../../components/ui'
import HeicSafeImg from '../../components/ui/HeicSafeImg'
import EditarRegistroModal from '../../components/evolucao/EditarRegistroModal'
import { timelineEvolucao, salvarRegistro } from '../../api/evolucao'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const MAX_COLS = 5 // datas comparadas lado a lado nas fotos

const fmtData = (d) => {
  if (!d || d === 'None') return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${(y || '').slice(2)}`
}
const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))

// ─── Tooltip do gráfico de peso (instantâneo) ─────────────────────────────────
function ChartTipPeso({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1f] border border-[#323238] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-[#3B82F6] font-bold">{numBR(payload[0].value)} kg</p>
    </div>
  )
}

// ─── Gráfico de peso (recharts: eixo Y, linha vertical no hover, tooltip) ──────
export function GraficoPeso({ pontos }) {
  if (pontos.length < 2) {
    const unico = pontos[0]
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        {unico ? (
          <>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">Peso registrado</p>
            <p className="text-white text-4xl font-bold leading-none">{numBR(unico.peso)} <span className="text-lg text-gray-500">kg</span></p>
            <p className="text-gray-600 text-xs mt-2">{fmtData(unico.data)}</p>
            <p className="text-gray-600 text-[11px] mt-3">A curva aparece com 2+ registros de peso.</p>
          </>
        ) : (
          <p className="text-gray-500 text-xs">Sem peso registrado nestes pontos.</p>
        )}
      </div>
    )
  }
  const primeiro = pontos[0].peso
  const ultimo = pontos[pontos.length - 1].peso
  const delta = ultimo - primeiro
  const data = pontos.map((p) => ({ date: fmtData(p.data), peso: p.peso }))

  return (
    <div>
      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Atual</p>
          <p className="text-white text-2xl font-bold leading-none">{numBR(ultimo)} <span className="text-sm text-gray-500">kg</span></p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Variação total</p>
          <p className={`text-lg font-bold leading-none ${delta < 0 ? 'text-green-400' : delta > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
            {delta > 0 ? '+' : ''}{numBR(delta)} kg
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#323238" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#777' }} minTickGap={24} />
          <YAxis
            tick={{ fontSize: 10, fill: '#777' }}
            domain={['dataMin - 1', 'dataMax + 1']}
            width={40}
            tickFormatter={(v) => Math.round(v)}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTipPeso />} cursor={{ stroke: '#2563eb', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="peso" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Lightbox fullscreen ───────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
        <X size={20} />
      </button>
      <img src={src} alt="Fullscreen" draggable={false} onClick={e => e.stopPropagation()} className="max-h-screen max-w-full object-contain select-none" />
    </div>
  )
}

// ─── Comparação de fotos por slot (alinhada por slot_id) ──────────────────────
export function MatrizFotos({ registros }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const cols = registros // todas as datas — scroll horizontal resolve o "muitas fotos"
  // união dos slots por slot_id (rótulo/ordem do registro mais recente que o tem)
  const slotMap = new Map()
  cols.forEach((reg) => {
    ;(reg.fotos || []).forEach((f) => {
      if (!f.slot_id) return
      slotMap.set(f.slot_id, { slot_id: f.slot_id, rotulo: f.rotulo || '—', ordem: f.ordem ?? 999 })
    })
  })
  const slots = [...slotMap.values()].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  if (!slots.length) return <p className="text-gray-500 text-xs text-center py-6">Sem fotos nestes registros.</p>

  const urlDoSlot = (reg, slotId) => {
    const f = (reg.fotos || []).find((x) => x.slot_id === slotId)
    return f?.url || null
  }

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div className="overflow-x-auto">
        <div className="min-w-max space-y-4">
          {/* cabeçalho de datas */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${cols.length}, 120px)` }}>
            <div />
            {cols.map((reg) => (
              <div key={reg.name} className="text-center text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider">{fmtData(reg.data)}</div>
            ))}
          </div>
          {slots.map((slot) => (
            <div key={slot.slot_id} className="grid gap-2 items-center" style={{ gridTemplateColumns: `120px repeat(${cols.length}, 120px)` }}>
              <div className="text-[11px] font-semibold text-gray-300 pr-2">{slot.rotulo}</div>
              {cols.map((reg) => {
                const url = urlDoSlot(reg, slot.slot_id)
                const fullSrc = url ? `${FRAPPE_URL}${encodeURI(url)}` : null
                return (
                  <div key={reg.name} className="w-[120px] aspect-[3/4] relative group">
                    {fullSrc ? (
                      <>
                        <HeicSafeImg
                          src={fullSrc}
                          alt={slot.rotulo}
                          className="w-full h-full rounded-lg border border-[#323238] object-cover cursor-pointer"
                          loading="lazy"
                          onClick={() => setLightboxSrc(fullSrc)}
                        />
                        <button
                          onClick={() => setLightboxSrc(fullSrc)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded p-1"
                        >
                          <Maximize2 size={10} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full rounded-lg border border-dashed border-[#323238] flex items-center justify-center text-gray-600 text-[9px] text-center px-1">sem foto neste período</div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function EvolucaoAluno({ mode = 'both', embedded = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [editandoRegistro, setEditandoRegistro] = useState(null)
  const [mostrarEdicao, setMostrarEdicao] = useState(false)
  const errorModal = useErrorModal()

  useEffect(() => {
    let cancelado = false
    timelineEvolucao(id) // 1 requisição só (registros + fotos)
      .then((data) => {
        if (cancelado) return
        setRegistros(data.registros || [])
        setNome(data.nome || '')
      })
      .catch((e) => !cancelado && errorModal.show(e, 'Carregar evolução'))
      .finally(() => !cancelado && setLoading(false))
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="flex justify-center py-24"><Spinner />{errorModal.element}</div>

  const pontosPeso = registros.filter((r) => r.peso != null && r.peso > 0).map((r) => ({ data: r.data, peso: r.peso }))
  const showPeso = mode === 'both' || mode === 'peso'
  const showFotos = mode === 'both' || mode === 'fotos'
  const titulo = mode === 'peso' ? 'Peso' : mode === 'fotos' ? 'Fotos' : 'Evolução'

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-4xl mx-auto px-4 py-6 space-y-5'}>
      {!embedded && (
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg font-bold truncate">{titulo} · {nome || id}</h1>
            <p className="text-gray-500 text-xs">{registros.length} registro(s) na timeline (fonte única)</p>
          </div>
        </div>
      )}

      {registros.length === 0 ? (
        <div className="bg-[#29292e] rounded-xl border border-[#323238] p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum registro de evolução pra este aluno ainda.</p>
        </div>
      ) : (
        <>
          {showPeso && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323238] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider"><TrendingUp size={13} /> Peso ao longo do tempo</h2>
              <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setMostrarEdicao((v) => !v)}>{mostrarEdicao ? 'Ocultar' : 'Ver registros'}</Button>
            </div>
            <GraficoPeso pontos={pontosPeso} />

            {mostrarEdicao && (
            <div className="mt-4 border-t border-[#323238]/50 pt-3 space-y-1">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider font-bold mb-1">Registros — clique no lápis para editar data, peso e fotos</p>
              {[...registros].reverse().map((r) => (
                <div key={r.name} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5">
                  <span className="text-gray-400 text-xs w-14 shrink-0">{fmtData(r.data)}</span>
                  <span className="flex-1 text-sm font-semibold">
                    {r.peso != null && r.peso > 0 ? <span className="text-white">{numBR(r.peso)} kg</span> : <span className="text-gray-600 font-normal italic">sem peso</span>}
                  </span>
                  {r.fotos?.length > 0 && (
                    <span className="text-gray-600 text-[10px]">{r.fotos.length} foto{r.fotos.length > 1 ? 's' : ''}</span>
                  )}
                  <button
                    onClick={() => setEditandoRegistro(r)}
                    title="Editar data, peso e fotos"
                    className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors shrink-0"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              ))}
            </div>
            )}
          </div>
          )}

          {showFotos && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323238] p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><Images size={13} /> Comparação de fotos <span className="text-gray-600 normal-case">· role pro lado →</span></h2>
            <MatrizFotos registros={registros} />
          </div>
          )}
        </>
      )}
      {editandoRegistro && (
        <EditarRegistroModal
          registro={editandoRegistro}
          onClose={() => setEditandoRegistro(null)}
          onSalvo={(atualizado) => {
            setRegistros(rs => rs.map(r => r.name === atualizado.name ? { ...r, ...atualizado } : r))
            setEditandoRegistro(null)
          }}
        />
      )}
      {errorModal.element}
    </div>
  )
}
