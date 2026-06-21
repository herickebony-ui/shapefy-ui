import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, FileText, MessageCircle } from 'lucide-react'
import { Button, Spinner, EmptyState, Modal, Input, Textarea } from '../../components/ui'
import useAuthSrc from '../../hooks/useAuthSrc'
import useErrorModal from '../../hooks/useErrorModal'
import { listarComunidades, criarComunidade, uploadImagemComunidade } from '../../api/comunidade'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

function CommunityCard({ item, onClick }) {
  const imgSrc = useAuthSrc(item.imagem ? `${FRAPPE_URL}${item.imagem}` : null)

  return (
    <button onClick={onClick}
      className="w-full text-left bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/40 rounded-xl p-4 transition-colors">
      <div className="flex items-start gap-3">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#323238] shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[#2563eb]/10 flex items-center justify-center shrink-0">
            <MessageCircle size={20} className="text-[#2563eb]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-bold truncate">{item.titulo}</h3>
          {item.descricao && (
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{item.descricao}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-gray-500 text-[10px]">
              <Users size={11} /> {item.quantidade_membros || 0} membros
            </span>
            <span className="flex items-center gap-1 text-gray-500 text-[10px]">
              <FileText size={11} /> {item.quantidade_posts || 0} posts
            </span>
            {item.status !== 'Ativa' && (
              <span className="text-yellow-500/80 text-[10px] font-bold uppercase">{item.status}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ComunidadeListagem() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCriar, setShowCriar] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [criando, setCriando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarComunidades()
      setComunidades(res)
    } catch (e) {
      errorModal.show(e, 'Carregar comunidades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleCriar = async () => {
    if (!titulo.trim()) return
    setCriando(true)
    try {
      const res = await criarComunidade({ titulo: titulo.trim(), descricao: descricao.trim() })
      setShowCriar(false)
      setTitulo('')
      setDescricao('')
      navigate(`/comunidade/${res.name}`)
    } catch (e) {
      errorModal.show(e, 'Criar comunidade')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="p-4 md:p-8 text-white">
      {errorModal.element}
      <div className="max-w-screen-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold">Comunidades</h1>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCriar(true)}>
            Nova Comunidade
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : comunidades.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma comunidade"
            description="Crie sua primeira comunidade e comece a interagir com seus alunos."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {comunidades.map(c => (
              <CommunityCard key={c.name} item={c}
                onClick={() => navigate(`/comunidade/${c.name}`)} />
            ))}
          </div>
        )}
      </div>

      {showCriar && (
        <Modal isOpen onClose={() => setShowCriar(false)} title="Nova Comunidade" size="md"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowCriar(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleCriar} loading={criando}
                disabled={!titulo.trim() || criando}>Criar</Button>
            </div>
          }>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Nome da comunidade *</label>
              <Input value={titulo} onChange={setTitulo} placeholder="Ex: Desafio 30 dias" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Descrição</label>
              <Textarea value={descricao} onChange={setDescricao}
                placeholder="Sobre o que é esta comunidade..." rows={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
