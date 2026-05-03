import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, AlertCircle } from 'lucide-react'
import { Avatar, Spinner, Autocomplete } from '../../../components/ui'
import { listarAlunos } from '../../../api/alunos'
import { obterStatusCronogramaAlunos } from '../../../api/cronogramaFeedbacks'
import { fmtDateBR, todayISO } from './utils'

const RECENTES_QTD = 10

/**
 * Estado vazio da tela "Planejar Feedbacks do Aluno": foco único em
 * achar e abrir um aluno. Sem cards de stats, sem tabela densa.
 *
 *  - Autocomplete grande no topo (server-side via listarAlunos.search).
 *  - Lista compacta dos N alunos com cronograma mais recentemente
 *    cadastrados, com status curto (próxima data ou atraso).
 */
export default function HubAlunosCronograma() {
  const navigate = useNavigate()
  const [recentes, setRecentes] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const res = await listarAlunos({ limit: RECENTES_QTD * 3 })
        if (cancelado) return
        const lista = (res.list || []).slice(0, RECENTES_QTD * 3)
        const ids = lista.map((a) => a.name)
        const stat = ids.length ? await obterStatusCronogramaAlunos(ids).catch(() => ({})) : {}
        if (cancelado) return
        // Só os que tem cronograma criado (total > 0)
        const comCronograma = lista
          .filter((a) => (stat?.[a.name]?.total || 0) > 0)
          .slice(0, RECENTES_QTD)
        setRecentes(comCronograma)
        setStatusMap(stat || {})
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => { cancelado = true }
  }, [])

  const irPara = (id) => navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(id)}`)

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-white">Buscar aluno</h2>
        <p className="text-gray-500 text-sm">Digite o nome pra abrir o cronograma do aluno</p>
      </div>

      <Autocomplete
        searchFn={async (q) => {
          if (!q || q.length < 2) return []
          const res = await listarAlunos({ search: q, limit: 50 })
          return res.list || []
        }}
        onSelect={(a) => a?.name && irPara(a.name)}
        renderItem={(a) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar nome={a.nome_completo} foto={a.foto} size="sm" />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{a.nome_completo}</p>
              {a.email && <p className="text-gray-500 text-[11px] truncate">{a.email}</p>}
            </div>
          </div>
        )}
        placeholder="Digite o nome do aluno..."
        icon={Search}
      />

      {/* Lista de recentes com cronograma */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">
          Cronogramas recentes
        </h3>
        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : recentes.length === 0 ? (
          <p className="text-gray-600 text-xs italic text-center py-6">
            Nenhum aluno com cronograma criado ainda.
          </p>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl divide-y divide-[#323238]/50 overflow-hidden">
            {recentes.map((a) => {
              const s = statusMap[a.name] || {}
              const atrasados = s.atrasados || 0
              const proximo = s.proximo
              const hoje = todayISO()
              let chip = null
              if (atrasados > 0) {
                chip = (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-300 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <AlertCircle size={10} />
                    {atrasados} atrasad{atrasados === 1 ? 'a' : 'as'}
                  </span>
                )
              } else if (proximo) {
                const diff = Math.floor((new Date(proximo + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000)
                let label = 'futura'
                if (diff === 0) label = 'hoje'
                else if (diff === 1) label = 'amanhã'
                else if (diff < 7) label = `em ${diff}d`
                else label = fmtDateBR(proximo)
                chip = (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Próx · {label}
                  </span>
                )
              }
              return (
                <button
                  key={a.name}
                  onClick={() => irPara(a.name)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar nome={a.nome_completo} foto={a.foto} size="sm" />
                    <p className="text-white text-sm font-medium truncate">{a.nome_completo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {chip}
                    <ChevronRight size={14} className="text-gray-500" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
