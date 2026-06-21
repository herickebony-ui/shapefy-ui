import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '../../components/ui'
import PostCard from '../../components/comunidade/PostCard'
import useErrorModal from '../../hooks/useErrorModal'
import * as api from '../../api/comunidade'

export default function PostDetalheAluno() {
  const { name: community, postName } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.alunoObterPost(postName)
      .then(p => setPost(p))
      .catch(e => errorModal.show(e, 'Carregar post'))
      .finally(() => setLoading(false))
  }, [postName])

  const handleDeletePost = async () => {
    try {
      await api.alunoExcluirPost(postName)
      navigate(`/aluno/comunidades/${community}`)
    } catch (e) { errorModal.show(e, 'Excluir post') }
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg,#121214)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border,#323238)] bg-[var(--sf-bg,#121214)]/95 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => navigate(`/aluno/comunidades/${community}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Voltar ao feed
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : post ? (
          <PostCard
            post={post}
            community={community}
            isAluno
            expandComments
            onToggleLike={api.alunoToggleReacao}
            onComment={async (pName, text) => { await api.alunoCriarComentario(pName, text) }}
            onEditPost={async (pName, caption) => { await api.alunoEditarPost(pName, caption) }}
            onDeletePost={handleDeletePost}
            onEditComment={async (c, text) => { await api.alunoEditarComentario(c, text) }}
            onDeleteComment={async (c) => { await api.alunoExcluirComentario(c) }}
            commentApi={api.alunoComentarios}
          />
        ) : (
          <p className="text-gray-500 text-sm text-center py-12">Post não encontrado.</p>
        )}
      </div>
    </div>
  )
}
