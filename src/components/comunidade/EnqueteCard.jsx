import { useState } from 'react'
import { BarChart3, X, Clock } from 'lucide-react'

const fmtTempo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  if (diff <= 0) return 'Encerrada'
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h restantes`
  return `${Math.floor(h / 24)}d restantes`
}

export default function EnqueteCard({ poll, onVote, onClose, canManage = false }) {
  const [voting, setVoting] = useState(false)
  const [myVote, setMyVote] = useState(poll.my_vote)
  const [opcoes, setOpcoes] = useState(poll.opcoes)
  const [totalVotos, setTotalVotos] = useState(poll.total_votos)

  const handleVote = async (opcaoName) => {
    if (voting) return
    setVoting(true)
    try {
      const res = await onVote(poll.name, opcaoName)
      if (res.voted) {
        const oldVote = myVote
        setMyVote(res.opcao)
        setOpcoes(prev => prev.map(o => {
          let v = o.votos
          if (o.name === oldVote) v = Math.max(0, v - 1)
          if (o.name === res.opcao) v = v + 1
          return { ...o, votos: v }
        }))
        if (!oldVote) setTotalVotos(t => t + 1)
      } else {
        setOpcoes(prev => prev.map(o =>
          o.name === myVote ? { ...o, votos: Math.max(0, o.votos - 1) } : o
        ))
        setMyVote(null)
        setTotalVotos(t => Math.max(0, t - 1))
      }
    } catch { /* ignore */ }
    finally { setVoting(false) }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2563eb]/30 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#2563eb]" />
          <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest">Enquete</span>
        </div>
        <div className="flex items-center gap-2">
          {poll.data_encerramento && (
            <span className="text-gray-500 text-[10px] flex items-center gap-1">
              <Clock size={10} /> {fmtTempo(poll.data_encerramento)}
            </span>
          )}
          {canManage && onClose && (
            <button onClick={() => { if (confirm('Encerrar esta enquete?')) onClose(poll.name) }}
              className="text-gray-500 hover:text-red-400 transition-colors" title="Encerrar enquete">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="px-4 pb-3 text-white text-sm font-semibold">{poll.pergunta}</p>

      <div className="px-4 pb-4 space-y-2">
        {opcoes.map(o => {
          const pct = totalVotos > 0 ? Math.round((o.votos / totalVotos) * 100) : 0
          const isMyChoice = myVote === o.name

          return myVote ? (
            <button key={o.name} onClick={() => handleVote(o.name)} disabled={voting}
              className="w-full relative text-left disabled:opacity-50">
              <div className="absolute inset-0 rounded-lg bg-[#2563eb]/10"
                style={{ width: `${pct}%` }} />
              <div className={`relative flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                isMyChoice ? 'border-[#2563eb]/50' : 'border-transparent hover:border-[#323238]'
              }`}>
                <span className={`text-sm ${isMyChoice ? 'text-white font-semibold' : 'text-gray-300'}`}>
                  {o.texto} {isMyChoice && '✓'}
                </span>
                <span className="text-gray-400 text-xs font-medium">{pct}%</span>
              </div>
            </button>
          ) : (
            <button key={o.name} onClick={() => handleVote(o.name)} disabled={voting}
              className="w-full px-3 py-2.5 rounded-lg border border-[#323238] text-sm text-gray-300 hover:border-[#2563eb]/50 hover:text-white transition-colors text-left disabled:opacity-50">
              {o.texto}
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-3">
        <p className="text-gray-600 text-[10px]">
          {totalVotos} voto{totalVotos !== 1 ? 's' : ''}
          {myVote && ' · Clique para trocar ou remover seu voto'}
        </p>
      </div>
    </div>
  )
}
