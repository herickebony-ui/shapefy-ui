import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, MessageCircle, Loader2 } from 'lucide-react'
import { Spinner, EmptyState } from '../../components/ui'
import PostCard from '../../components/comunidade/PostCard'
import EnqueteCard from '../../components/comunidade/EnqueteCard'
import CriarPostModal from '../../components/comunidade/CriarPostModal'
import useAuthSrc from '../../hooks/useAuthSrc'
import useErrorModal from '../../hooks/useErrorModal'
import usePullToRefresh from '../../hooks/usePullToRefresh.jsx'
import * as api from '../../api/comunidade'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

export default function ComunidadeFeedAluno() {
  const { name } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [showCriar, setShowCriar] = useState(false)
  const [comunidade, setComunidade] = useState(null)
  const [poll, setPoll] = useState(null)
  const [publicando, setPublicando] = useState(false)
  const [totalComunidades, setTotalComunidades] = useState(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    api.alunoComunidades().then(list => {
      setTotalComunidades(list.length)
      const found = list.find(c => c.name === name)
      if (found) setComunidade(found)
    }).catch(() => {})
  }, [name])

  const imgSrc = useAuthSrc(comunidade?.imagem ? `${FRAPPE_URL}${comunidade.imagem}` : null)

  const loadPoll = useCallback(async () => {
    try {
      const p = await api.alunoEnqueteAtiva(name)
      setPoll(p || null)
    } catch { setPoll(null) }
  }, [name])

  const load = useCallback(async (nextCursor) => {
    if (nextCursor) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await api.alunoFeed(name, { cursor: nextCursor, limit: 20 })
      if (nextCursor) {
        setPosts(prev => [...prev, ...res.posts])
      } else {
        setPosts(res.posts)
      }
      setHasMore(res.has_more)
      setCursor(res.next_cursor)
    } catch { /* ignore */ }
    finally { setLoading(false); setLoadingMore(false) }
  }, [name])

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

  const handleNewPost = async ({ caption, imagens, files }) => {
    if (files && files.length > 0) {
      setPublicando(true)
      try {
        const urls = []
        for (const f of files) {
          urls.push(await api.uploadImagemComunidade(f))
        }
        await api.alunoCriarPost(name, { caption, imagens: urls })
        load(null)
      } catch (e) {
        errorModal.show(e, 'Criar post')
      } finally {
        setPublicando(false)
      }
      return
    }
    await api.alunoCriarPost(name, { caption, imagens: imagens || [] })
    load(null)
  }

  const handleDeletePost = async (postName) => {
    try {
      await api.alunoExcluirPost(postName)
      setPosts(prev => prev.filter(p => p.name !== postName))
    } catch (e) { errorModal.show(e, 'Excluir post') }
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg,#121214)] min-h-full">
      {errorModal.element}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border,#323238)] bg-[var(--sf-bg,#121214)]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(totalComunidades === 1 ? '/aluno' : '/aluno/comunidades')} title="Voltar"
            className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border,#323238)] hover:border-[var(--sf-border-strong,#4a4a52)] rounded-lg transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          {imgSrc ? (
            <img src={imgSrc} alt="" className="w-8 h-8 rounded-lg object-cover border border-[var(--sf-border,#323238)] shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[var(--sf-blue,#2563eb)]/10 flex items-center justify-center shrink-0">
              <MessageCircle size={14} className="text-[var(--sf-blue,#2563eb)]" />
            </div>
          )}
          <h1 className="text-white text-base font-bold truncate flex-1">
            {comunidade?.titulo || 'Comunidade'}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {pullIndicator}
        <button onClick={() => setShowCriar(true)}
          className="w-full flex items-center gap-3 px-4 h-11 rounded-xl bg-[var(--sf-surface,#1a1a1a)] border border-[var(--sf-border,#323238)] hover:border-[var(--sf-blue,#2563eb)]/40 text-gray-400 text-sm transition-colors">
          <Plus size={16} className="text-[var(--sf-blue,#2563eb)]" />
          Compartilhar algo...
        </button>

        {publicando && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--sf-blue,#2563eb)]/10 border border-[var(--sf-blue,#2563eb)]/20 rounded-xl">
            <Loader2 size={14} className="text-[var(--sf-blue,#2563eb)] animate-spin" />
            <span className="text-[var(--sf-blue,#2563eb)] text-xs font-medium">Publicando seu post...</span>
          </div>
        )}

        {/* Enquete ativa no topo */}
        {poll && (
          <EnqueteCard poll={poll} onVote={api.alunoVotarEnquete} />
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhum post ainda"
            description="Seja o primeiro a publicar!"
          />
        ) : (
          <>
            {posts.map(p => (
              <PostCard
                key={p.name}
                post={p}
                community={name}
                isAluno
                onToggleLike={api.alunoToggleReacao}
                onComment={async (postName, text, parentComment) => { await api.alunoCriarComentario(postName, text, parentComment) }}
                onEditPost={async (postName, caption) => { await api.alunoEditarPost(postName, caption) }}
                onDeletePost={handleDeletePost}
                onEditComment={async (comment, text) => { await api.alunoEditarComentario(comment, text) }}
                onDeleteComment={async (comment) => { await api.alunoExcluirComentario(comment) }}
                commentApi={api.alunoComentarios}
                replyApi={api.alunoListarRespostas}
              />
            ))}
            <div ref={sentinelRef} className="h-4">
              {loadingMore && (
                <div className="flex justify-center py-3"><Spinner size="sm" /></div>
              )}
            </div>
          </>
        )}
      </div>

      <CriarPostModal isOpen={showCriar} onClose={() => setShowCriar(false)} onSubmit={handleNewPost} asyncMode />
    </div>
  )
}
