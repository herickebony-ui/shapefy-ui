import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Users, Settings } from 'lucide-react'
import { Tabs, Spinner } from '../../components/ui'
import useErrorModal from '../../hooks/useErrorModal'
import useAuthSrc from '../../hooks/useAuthSrc'
import ComunidadeFeed from './ComunidadeFeed'
import ComunidadeMembros from './ComunidadeMembros'
import ComunidadeConfiguracoes from './ComunidadeConfiguracoes'
import * as api from '../../api/comunidade'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'membros', label: 'Membros' },
  { id: 'config', label: 'Configurações' },
]

export default function ComunidadeDetalhe() {
  const { name } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [aba, setAba] = useState('feed')
  const [comunidade, setComunidade] = useState(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.listarComunidades()
      const found = list.find(c => c.name === name)
      if (!found) {
        errorModal.show({ message: 'Comunidade não encontrada' }, 'Erro')
        return
      }
      setComunidade(found)
    } catch (e) {
      errorModal.show(e, 'Carregar comunidade')
    } finally {
      setLoading(false)
    }
  }, [name])

  useEffect(() => { carregar() }, [carregar])

  const imgSrc = useAuthSrc(comunidade?.imagem ? `${FRAPPE_URL}${comunidade.imagem}` : null)

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  if (!comunidade) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Comunidade não encontrada.</p>
        <button onClick={() => navigate('/comunidade')}
          className="text-[#2563eb] text-sm mt-2 hover:underline">Voltar</button>
      </div>
    )
  }

  return (
    <div className="text-white">
      {errorModal.element}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1a1a1a]/95 backdrop-blur border-b border-[#323238]">
        <div className="max-w-screen-md mx-auto px-4 md:px-8 py-3">
          <button onClick={() => navigate('/comunidade')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors mb-3">
            <ArrowLeft size={14} /> Comunidades
          </button>

          <div className="flex items-center gap-3">
            {imgSrc ? (
              <img src={imgSrc} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#323238] shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#2563eb]/10 flex items-center justify-center shrink-0">
                <MessageCircle size={20} className="text-[#2563eb]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-lg font-bold truncate">{comunidade.titulo}</h1>
              <div className="flex items-center gap-3 text-gray-500 text-xs mt-0.5">
                <span className="flex items-center gap-1"><Users size={11} /> {comunidade.quantidade_membros} membros</span>
                <span>{comunidade.quantidade_posts} posts</span>
                {comunidade.status !== 'Ativa' && (
                  <span className="text-yellow-500 font-bold">{comunidade.status}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 -mb-px">
            <Tabs tabs={TABS} active={aba} onChange={setAba} variant="underline" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-md mx-auto px-4 md:px-8 py-4">
        {aba === 'feed' && <ComunidadeFeed community={name} />}
        {aba === 'membros' && <ComunidadeMembros community={name} onUpdate={carregar} />}
        {aba === 'config' && (
          <ComunidadeConfiguracoes
            community={name}
            comunidade={comunidade}
            onUpdate={carregar}
          />
        )}
      </div>
    </div>
  )
}
