import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, MessageSquare } from 'lucide-react'
import { Spinner } from '../../../components/ui'
import { listarAgendamentosDoAluno, salvarAgendamento } from '../../../api/cronogramaFeedbacks'
import { fmtDateBR, fmtDateTimeBR } from './utils'

// O histórico mostra APENAS feedbacks já respondidos (têm respondido_em).
// O planejamento futuro fica na tabela "Datas do Cronograma" — aqui é só "o que já chegou".
const filtrarRespondidos = (dates) =>
  dates
    .filter(d => !d.is_start && (d.respondido_em || d.status === 'Respondido' || d.status === 'Concluido'))
    .sort((a, b) => {
      const at = a.respondido_em || a.date
      const bt = b.respondido_em || b.date
      return bt.localeCompare(at) // mais recente primeiro
    })

// Dias de atraso vs. data prevista (negativo = adiantado)
const calcAtraso = (item) => {
  if (!item.respondido_em) return null
  const prevista = new Date(item.date + 'T00:00:00')
  const enviada = new Date(String(item.respondido_em).replace(' ', 'T'))
  enviada.setHours(0, 0, 0, 0)
  prevista.setHours(0, 0, 0, 0)
  return Math.floor((enviada - prevista) / 86400000)
}

const BadgeAtraso = ({ dias }) => {
  if (dias == null) return null
  if (dias <= 0) {
    return <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-green-400 bg-green-500/10 border-green-500/30">Em dia</span>
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-orange-400 bg-orange-500/10 border-orange-500/20">+{dias}d</span>
}

const EmptyHistorico = () => (
  <div className="py-8 flex flex-col items-center gap-2">
    <MessageSquare size={20} className="text-gray-600" />
    <p className="text-gray-500 text-xs italic">Nenhum feedback respondido ainda.</p>
    <p className="text-gray-600 text-[10px]">Quando o aluno responder, aparecerá aqui.</p>
  </div>
)

// ─── Tabela ──────────────────────────────────────────────────────────────────
export function HistoricoTabela({ schedule }) {
  const navigate = useNavigate()
  const dados = filtrarRespondidos(schedule.dates)
  if (dados.length === 0) return <EmptyHistorico />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-[#323238]">
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Recebido</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Tipo</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Prevista</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Atraso</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center w-10"></th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => {
            const isTr = !!d.is_training
            const atraso = calcAtraso(d)
            return (
              <tr key={d.date} className={`border-b border-[#323238]/40 ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}>
                <td className="px-3 py-2 text-white font-medium">
                  {d.respondido_em ? fmtDateTimeBR(d.respondido_em) : fmtDateBR(d.date)}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    isTr
                      ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                      : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                  }`}>{isTr ? 'Troca' : 'Feedback'}</span>
                </td>
                <td className="px-3 py-2 text-gray-400">{fmtDateBR(d.date)}</td>
                <td className="px-3 py-2 text-center">
                  <BadgeAtraso dias={atraso} />
                </td>
                <td className="px-3 py-2 text-center">
                  {d.feedback_resposta ? (
                    <button onClick={() => navigate(`/feedbacks/${encodeURIComponent(d.feedback_resposta)}`)}
                      title="Abrir feedback respondido"
                      className="h-6 w-6 inline-flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-700 border border-[#323238] hover:border-blue-600 rounded transition-colors">
                      <Eye size={11} />
                    </button>
                  ) : <span className="text-gray-700">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Timeline ────────────────────────────────────────────────────────────────
export function HistoricoTimeline({ schedule }) {
  const navigate = useNavigate()
  const dados = filtrarRespondidos(schedule.dates)
  if (dados.length === 0) return <EmptyHistorico />
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute top-2 bottom-2 left-2 w-px bg-[#323238]" />
      {dados.map(d => {
        const isTr = !!d.is_training
        const atraso = calcAtraso(d)
        const dotColor = isTr ? 'bg-purple-500' : 'bg-green-500'
        return (
          <div key={d.date} className="relative">
            <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-[#29292e] ${dotColor}`} />
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-white text-xs font-bold">
                {d.respondido_em ? fmtDateTimeBR(d.respondido_em) : fmtDateBR(d.date)}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isTr
                  ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                  : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
              }`}>{isTr ? 'Troca' : 'Feedback'}</span>
              <BadgeAtraso dias={atraso} />
              <span className="text-[10px] text-gray-500">prev. {fmtDateBR(d.date)}</span>
              {d.feedback_resposta && (
                <button onClick={() => navigate(`/feedbacks/${encodeURIComponent(d.feedback_resposta)}`)}
                  className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 underline">
                  Abrir →
                </button>
              )}
            </div>
            {d.nota && <p className="text-xs text-gray-400 bg-[#1a1a1a] border border-[#323238] rounded p-2">{d.nota}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Histórico Rápido (modal do dashboard) ───────────────────────────────────
export function HistoricoRapido({ alunoId, formulariosPorId, showToast }) {
  const [datas, setDatas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvandoIdx, setSalvandoIdx] = useState(null)

  useEffect(() => {
    if (!alunoId) return
    let cancel = false
    setLoading(true)
    listarAgendamentosDoAluno(alunoId)
      .then(list => {
        if (cancel) return
        const ordenados = [...list].sort((a, b) => (b.data_agendada || '').localeCompare(a.data_agendada || ''))
        setDatas(ordenados)
      })
      .catch(e => { console.error(e); showToast('Falha no histórico', 'error') })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [alunoId, showToast])

  const salvarNotaItem = async (idx, nota) => {
    setSalvandoIdx(idx)
    try {
      const item = datas[idx]
      await salvarAgendamento(item.name, { nota })
      setDatas(prev => prev.map((x, i) => i === idx ? { ...x, nota } : x))
      showToast('Nota salva', 'success')
    } catch (e) {
      console.error(e); showToast('Falha ao salvar nota', 'error')
    } finally { setSalvandoIdx(null) }
  }

  if (loading) return <div className="p-6"><Spinner /></div>
  if (datas.length === 0) return <p className="p-6 text-gray-500 text-center text-sm">Sem agendamentos ainda.</p>

  return (
    <div className="p-4 space-y-3">
      {datas.map((d, i) => {
        const isTr = !!d.is_training
        const isDone = d.status === 'Respondido' || d.status === 'Concluido'
        const dotColor = isDone ? 'bg-green-500' : d.respondido_em ? 'bg-blue-500' : 'bg-gray-500'
        return (
          <div key={d.name} className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <span className="text-white text-xs font-bold">{fmtDateBR(d.data_agendada)}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isTr
                  ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                  : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
              }`}>{isTr ? 'Troca' : 'Feedback'}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isDone
                  ? 'text-green-400 bg-green-500/10 border-green-500/30'
                  : 'text-gray-400 bg-[#0a0a0a] border-[#323238]'
              }`}>{d.status || 'Aguardando'}</span>
              <span className="text-[10px] text-gray-500 ml-auto truncate max-w-[150px]">
                {formulariosPorId[d.formulario]?.titulo || d.formulario}
              </span>
            </div>
            <textarea
              defaultValue={d.nota || ''}
              onBlur={(e) => {
                const novo = e.target.value
                if (novo === (d.nota || '')) return
                salvarNotaItem(i, novo)
              }}
              rows={2}
              placeholder="Nota interna…"
              disabled={salvandoIdx === i}
              className="w-full p-2 bg-[#0a0a0a] border border-[#323238] rounded text-white text-xs outline-none focus:border-[#2563eb]/60 resize-none"
            />
          </div>
        )
      })}
    </div>
  )
}
