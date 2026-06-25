import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '../../components/ui'
import PostCard from '../../components/comunidade/PostCard'
import useErrorModal from '../../hooks/useErrorModal'
import * as api from '../../api/comunidade'

export default function PostDetalhe() {
  const { name: community, postName } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.obterPost(postName)
      .then(p => setPost(p))
      .catch(e => errorModal.show(e, 'Carregar post'))
      .finally(() => setLoading(false))
  }, [postName])

  const handleDeletePost = async () => {
    try {
      await api.excluirPost(postName)
      navigate(`/comunidade/${community}`)
    } catch (e) { errorModal.show(e, 'Excluir post') }
  }

  return (
    <div className="max-w-screen-md mx-auto px-4 md:px-8 py-4 text-white">
      {errorModal.element}

      <button onClick={() => navigate(`/comunidade/${community}`)}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-3">
        <ArrowLeft size={16} /> Voltar ao feed
      </button>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : post ? (
        <PostCard
          post={post}
          community={community}
          canModerate
          expandComments
          onToggleLike={api.toggleReacao}
          onComment={async (pName, text, parentComment) => { await api.criarComentario(pName, text, parentComment) }}
          onHidePost={async () => { await api.ocultarPost(postName); navigate(`/comunidade/${community}`) }}
          onHideComment={async (c) => { await api.ocultarComentario(c) }}
          onEditPost={async (pName, caption) => { await api.editarPost(pName, caption) }}
          onDeletePost={handleDeletePost}
          onEditComment={async (c, text) => { await api.editarComentario(c, text) }}
          onDeleteComment={async (c) => { await api.excluirComentario(c) }}
          commentApi={api.listarComentarios}
          replyApi={api.listarRespostas}
        />
      ) : (
        <p className="text-gray-500 text-sm text-center py-12">Post não encontrado.</p>
      )}
    </div>
  )
}
