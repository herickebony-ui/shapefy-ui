import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Images } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { listarRegistrosPorAluno, buscarRegistro } from '../../api/evolucao'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const MAX_COLS = 5 // datas comparadas lado a lado nas fotos

const fmtData = (d) => {
  if (!d || d === 'None') return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}`
}
const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))

// ─── Gráfico de peso (SVG inline) ─────────────────────────────────────────────
function GraficoPeso({ pontos }) {
  if (pontos.length < 2) {
    return <p className="text-gray-500 text-xs text-center py-6">Poucos registros de peso pra traçar o gráfico (mínimo 2).</p>
  }
  const pesos = pontos.map((p) => p.peso)
  const min = Math.min(...pesos)
  const max = Math.max(...pesos)
  const range = max - min || 1
  const coords = pontos.map((p, i) => ({
    x: (i / (pontos.length - 1)) * 100,
    y: 100 - ((p.peso - min) / range) * 100,
    peso: p.peso,
    data: p.data,
  }))
  const poly = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const primeiro = pontos[0].peso
  const ultimo = pontos[pontos.length - 1].peso
  const delta = ultimo - primeiro

  return (
    <div>
      <div className="flex items-end gap-4 mb-4">
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
      <div className="relative w-full h-40">
        <div className="absolute left-2 right-2 top-6 bottom-8">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <polyline points={poly} fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {coords.map((c, i) => (
            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
              <div className="h-2 w-2 rounded-full bg-[#3B82F6] border-2 border-[#1a1a1a]" />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-3 text-[9px] font-bold text-white whitespace-nowrap">{numBR(c.peso)}</span>
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] text-gray-500 whitespace-nowrap">{fmtData(c.data)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Comparação de fotos por slot (alinhada por slot_id) ──────────────────────
function MatrizFotos({ registros }) {
  const cols = registros.slice(-MAX_COLS) // últimas N datas
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
              return (
                <div key={reg.name} className="w-[120px] aspect-[3/4]">
                  {url ? (
                    <img src={`${FRAPPE_URL}${url}`} alt={slot.rotulo} className="w-full h-full rounded-lg border border-[#323238] object-cover" loading="lazy" />
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
  )
}

export default function EvolucaoAluno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [registrosFotos, setRegistrosFotos] = useState([]) // docs completos (com fotos) das últimas datas
  const [loading, setLoading] = useState(true)
  const errorModal = useErrorModal()

  useEffect(() => {
    let cancelado = false
    const carregar = async () => {
      try {
        const data = await listarRegistrosPorAluno(id)
        if (cancelado) return
        setRegistros(data)
        // A listagem não traz child tables (fotos) — busca o doc completo das últimas N datas.
        const ultimos = data.slice(-MAX_COLS)
        const completos = await Promise.all(ultimos.map((r) => buscarRegistro(r.name).catch(() => null)))
        if (!cancelado) setRegistrosFotos(completos.filter(Boolean))
      } catch (e) {
        if (!cancelado) errorModal.show(e, 'Carregar evolução')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="flex justify-center py-24"><Spinner />{errorModal.element}</div>

  const nome = registros[0]?.nome_completo || id
  const pontosPeso = registros.filter((r) => r.peso != null && r.peso > 0).map((r) => ({ data: r.data, peso: r.peso }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors shrink-0">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-lg font-bold truncate">Evolução · {nome}</h1>
          <p className="text-gray-500 text-xs">{registros.length} registro(s) na timeline (fonte única)</p>
        </div>
      </div>

      {registros.length === 0 ? (
        <div className="bg-[#29292e] rounded-xl border border-[#323238] p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum registro de evolução pra este aluno ainda.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323238] p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><TrendingUp size={13} /> Peso ao longo do tempo</h2>
            <GraficoPeso pontos={pontosPeso} />
          </div>

          <div className="bg-[#1a1a1a] rounded-xl border border-[#323238] p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><Images size={13} /> Comparação de fotos (últimas {MAX_COLS} datas)</h2>
            <MatrizFotos registros={registrosFotos} />
          </div>
        </>
      )}
      {errorModal.element}
    </div>
  )
}
