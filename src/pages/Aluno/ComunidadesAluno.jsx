import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Users } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import useAuthSrc from '../../hooks/useAuthSrc'
import { alunoComunidades } from '../../api/comunidade'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

function CommunityCard({ item, onClick }) {
  const imgSrc = useAuthSrc(item.imagem ? `${FRAPPE_URL}${item.imagem}` : null)

  return (
    <button onClick={onClick}
      className="w-full text-left bg-[var(--sf-surface,#1a1a1a)] border border-[var(--sf-border,#323238)] hover:border-[var(--sf-blue,#2563eb)]/40 rounded-xl p-4 transition-colors">
      <div className="flex items-center gap-3">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="w-11 h-11 rounded-lg object-cover border border-[var(--sf-border,#323238)] shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-[var(--sf-blue,#2563eb)]/10 flex items-center justify-center shrink-0">
            <MessageCircle size={18} className="text-[var(--sf-blue,#2563eb)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-bold truncate">{item.titulo}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[var(--sf-text-muted,#a1a1a6)] text-[10px]">
              <Users size={10} /> {item.quantidade_membros || 0}
            </span>
            <span className="text-[var(--sf-text-muted,#a1a1a6)] text-[10px]">
              {item.quantidade_posts || 0} posts
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ComunidadesAluno() {
  const navigate = useNavigate()
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await alunoComunidades()
      if (res.length === 1) {
        navigate(`/aluno/comunidades/${res[0].name}`, { replace: true })
        return
      }
      setComunidades(res)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="pb-8 bg-[var(--sf-bg,#121214)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border,#323238)] bg-[var(--sf-bg,#121214)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => navigate('/aluno')} title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border,#323238)] hover:border-[var(--sf-border-strong,#4a4a52)] rounded-lg transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Comunidades</h1>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : comunidades.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma comunidade"
            description="Você ainda não participa de nenhuma comunidade."
          />
        ) : (
          <div className="space-y-3">
            {comunidades.map(c => (
              <CommunityCard key={c.name} item={c}
                onClick={() => navigate(`/aluno/comunidades/${c.name}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
