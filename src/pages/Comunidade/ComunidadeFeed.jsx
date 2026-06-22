import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, BarChart3 } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import PostCard from '../../components/comunidade/PostCard'
import EnqueteCard from '../../components/comunidade/EnqueteCard'
import CriarPostModal from '../../components/comunidade/CriarPostModal'
import CriarEnqueteModal from '../../components/comunidade/CriarEnqueteModal'
import useErrorModal from '../../hooks/useErrorModal'
import usePullToRefresh from '../../hooks/usePullToRefresh.jsx'
import * as api from '../../api/comunidade'

export default function ComunidadeFeed({ community }) {
  const errorModal = useErrorModal()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [showCriar, setShowCriar] = useState(false)
  const [showEnquete, setShowEnquete] = useState(false)
  const [poll, setPoll] = useState(null)
  const sentinelRef = useRef(null)

  const loadPoll = useCallback(async () => {
    try {
      const p = await api.obterEnqueteAtiva(community)
      setPoll(p || null)
    } catch { setPoll(null) }
  }, [community])

  const load = useCallback(async (nextCursor) => {
    if (nextCursor) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await api.feedComunidade(community, { cursor: nextCursor, limit: 20 })
      if (nextCursor) {
        setPosts(prev => [...prev, ...res.posts])
      } else {
        setPosts(res.posts)
      }
      setHasMore(res.has_more)
      setCursor(res.next_cursor)
    } catch (e) {
      errorModal.show(e, 'Carregar feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [community])

  useEffect(() => { load(null); loadPoll() }, [load, loadPoll])

  const handleRefresh = useCallback(async () => {
    await Promise.all([load(null), loadPoll()])
  }, [load, loadPoll])
  const { indicator: pullIndicator } = usePullToRefresh(handleRefresh)

  // infinite scroll
  const cursorRef = useRef(cursor)
  const hasMoreRef = useRef(hasMore)
  const loadingMoreRef = useRef(loadingMore)
  cursorRef.current = cursor
  hasMoreRef.current = hasMore
  loadingMoreRef.current = loadingMore

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        load(cursorRef.current)
      }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [load])

  const handleNewPost = async ({ caption, imagens }) => {
    await api.criarPost(community, { caption, imagens })
    load(null)
  }

  const handleNewPoll = async ({ pergunta, opcoes }) => {
    await api.criarEnquete(community, pergunta, opcoes)
    loadPoll()
  }

  const handleClosePoll = async (enquete) => {
    try {
      await api.encerrarEnquete(enquete)
      setPoll(null)
    } catch (e) { errorModal.show(e, 'Encerrar enquete') }
  }

  const handleHidePost = async (postName) => {
    await api.ocultarPost(postName)
    setPosts(prev => prev.filter(p => p.name !== postName))
  }

  const handleDeletePost = async (postName) => {
    try {
      await api.excluirPost(postName)
      setPosts(prev => prev.filter(p => p.name !== postName))
    } catch (e) { errorModal.show(e, 'Excluir post') }
  }

  const handleEditPost = async (postName, caption) => {
    await api.editarPost(postName, caption)
  }

  return (
    <div className="space-y-3">
      {errorModal.element}
      {pullIndicator}

      <div className="flex gap-2">
        <button onClick={() => setShowCriar(true)}
          className="flex-1 flex items-center gap-3 px-4 h-12 rounded-xl bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/40 text-gray-400 text-sm transition-colors">
          <Plus size={16} className="text-[#2563eb]" />
          Criar novo post...
        </button>
        {!poll && (
          <button onClick={() => setShowEnquete(true)} title="Criar enquete"
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/40 text-gray-400 hover:text-[#2563eb] transition-colors shrink-0">
            <BarChart3 size={16} />
          </button>
        )}
      </div>

      {/* Enquete ativa no topo */}
      {poll && (
        <EnqueteCard poll={poll} canManage onVote={api.votarEnquete} onClose={handleClosePoll} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nenhum post ainda"
          description="Seja o primeiro a publicar algo na comunidade!"
        />
      ) : (
        <>
          {posts.map(p => (
            <PostCard
              key={p.name}
              post={p}
              community={community}
              canModerate
              onToggleLike={api.toggleReacao}
              onComment={async (postName, text) => { await api.criarComentario(postName, text) }}
              onHidePost={handleHidePost}
              onHideComment={async (commentName) => { await api.ocultarComentario(commentName) }}
              onEditPost={handleEditPost}
              onDeletePost={handleDeletePost}
              onEditComment={async (comment, text) => { await api.editarComentario(comment, text) }}
              onDeleteComment={async (comment) => { await api.excluirComentario(comment) }}
              onPinPost={async (postName) => { await api.fixarPost(postName); load(null) }}
              onUnpinPost={async (postName) => { await api.desfixarPost(postName); load(null) }}
              commentApi={api.listarComentarios}
            />
          ))}
          <div ref={sentinelRef} className="h-4">
            {loadingMore && (
              <div className="flex justify-center py-3"><Spinner size="sm" /></div>
            )}
          </div>
        </>
      )}

      <CriarPostModal isOpen={showCriar} onClose={() => setShowCriar(false)} onSubmit={handleNewPost} />
      <CriarEnqueteModal isOpen={showEnquete} onClose={() => setShowEnquete(false)} onSubmit={handleNewPoll} />
    </div>
  )
}
