import { useState, useEffect, useCallback } from 'react'
import { UserPlus } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import useAuthSrc from '../../hooks/useAuthSrc'
import useErrorModal from '../../hooks/useErrorModal'
import { listarMembros } from '../../api/comunidade'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

function MemberAvatar({ foto, nome }) {
  const src = useAuthSrc(foto ? `${FRAPPE_URL}${foto}` : null)
  if (src) return <img src={src} alt="" className="w-9 h-9 rounded-full object-cover border border-[#323238] shrink-0" />
  return (
    <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-sm shrink-0">
      {(nome || '?')[0].toUpperCase()}
    </div>
  )
}

export default function ComunidadeMembros({ community }) {
  const errorModal = useErrorModal()
  const [membros, setMembros] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarMembros(community, page)
      setMembros(res.list || [])
      setTotal(res.total || 0)
    } catch (e) {
      errorModal.show(e, 'Carregar membros')
    } finally {
      setLoading(false)
    }
  }, [community, page])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {errorModal.element}

      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
          {total} membro{total !== 1 ? 's' : ''}
        </p>
      </div>

      <p className="text-gray-500 text-xs mb-3">
        Alunos ativos são incluídos automaticamente. Ao desativar um aluno, ele é removido da comunidade.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : membros.length === 0 ? (
        <EmptyState icon={UserPlus} title="Nenhum membro" description="Seus alunos ativos aparecerão aqui automaticamente." />
      ) : (
        <div className="border border-[#323238] rounded-lg overflow-hidden divide-y divide-[#323238]/50">
          {membros.map(m => (
            <div key={m.name} className="flex items-center gap-3 px-3 py-2.5">
              <MemberAvatar foto={m.aluno_foto} nome={m.aluno_nome} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.aluno_nome || 'Profissional'}</p>
                <p className="text-gray-600 text-[10px]">{m.papel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
