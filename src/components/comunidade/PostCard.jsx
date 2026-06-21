import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, MoreHorizontal, EyeOff, Pencil, Trash2, Pin, PinOff } from 'lucide-react'
import useAuthSrc from '../../hooks/useAuthSrc'
import ComentarioSection from './ComentarioSection'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtTempo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function PostCard({
  post, community, onToggleLike, onComment, onHidePost, onHideComment,
  onEditPost, onDeletePost, onEditComment, onDeleteComment,
  onPinPost, onUnpinPost,
  canModerate = false, isAluno = false,
  commentApi, expandComments = false,
}) {
  const navigate = useNavigate()
  const [showComments, setShowComments] = useState(expandComments)
  const [showMenu, setShowMenu] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [liked, setLiked] = useState(post.liked_by_me || false)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [editing, setEditing] = useState(false)
  const [editCaption, setEditCaption] = useState(post.caption || '')
  const [caption, setCaption] = useState(post.caption || '')
  const [saving, setSaving] = useState(false)
  const [pinned, setPinned] = useState(!!post.is_pinned)

  const comName = community || post.comunidade
  const imgUrl = post.image ? `${FRAPPE_URL}${post.image}` : null
  const imgSrc = useAuthSrc(imgUrl)
  const avatarUrl = post.author_foto ? `${FRAPPE_URL}${post.author_foto}` : null
  const avatarSrc = useAuthSrc(avatarUrl)

  const handleLike = async () => {
    setLiked(!liked)
    setLikeCount(c => liked ? c - 1 : c + 1)
    try {
      await onToggleLike(post.name)
    } catch {
      setLiked(liked)
      setLikeCount(post.like_count || 0)
    }
  }

  const goToPost = () => {
    if (expandComments) return
    const url = isAluno
      ? `/aluno/comunidades/${comName}/post/${post.name}`
      : `/comunidade/${comName}/post/${post.name}`
    navigate(url)
  }

  const handleEditSave = async () => {
    if (!editCaption.trim() || !onEditPost) return
    setSaving(true)
    try {
      await onEditPost(post.name, editCaption.trim())
      setCaption(editCaption.trim())
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Excluir este post?')) return
    setShowMenu(false)
    onDeletePost?.(post.name)
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="w-9 h-9 rounded-full object-cover border border-[#323238] shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(post.author_nome || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={goToPost}>
          <div className="flex items-center gap-1.5">
            <p className="text-white text-sm font-semibold truncate">{post.author_nome}</p>
            {pinned && <Pin size={11} className="text-[#2563eb] shrink-0" />}
          </div>
          <p className="text-gray-500 text-[10px]">{fmtTempo(post.creation)}</p>
        </div>
        {(canModerate || post.is_mine) && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-white rounded-lg transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-44 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-xl p-1">
                  {post.is_mine && (
                    <>
                      <button
                        onClick={() => { setEditing(true); setEditCaption(caption); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-[#29292e] text-left transition-colors">
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-red-400/10 text-left transition-colors">
                        <Trash2 size={13} /> Excluir
                      </button>
                    </>
                  )}
                  {canModerate && (
                    pinned ? (
                      <button
                        onClick={async () => { await onUnpinPost?.(post.name); setPinned(false); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-[#29292e] text-left transition-colors">
                        <PinOff size={13} /> Desafixar
                      </button>
                    ) : (
                      <button
                        onClick={async () => { await onPinPost?.(post.name); setPinned(true); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-300 hover:bg-[#29292e] text-left transition-colors">
                        <Pin size={13} /> Fixar no topo
                      </button>
                    )
                  )}
                  {canModerate && !post.is_mine && (
                    <button
                      onClick={() => { onHidePost?.(post.name); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-400 hover:bg-red-400/10 text-left transition-colors">
                      <EyeOff size={13} /> Ocultar post
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Caption */}
      {editing ? (
        <div className="px-4 pb-2">
          <textarea
            value={editCaption}
            onChange={e => setEditCaption(e.target.value)}
            className="w-full bg-[#29292e] border border-[#323238] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] outline-none resize-none"
            rows={3}
            maxLength={2000}
          />
          <div className="flex gap-2 mt-1.5 justify-end">
            <button onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={handleEditSave} disabled={saving || !editCaption.trim()}
              className="px-3 py-1.5 text-xs bg-[#2563eb] text-white rounded-lg disabled:opacity-40 transition-opacity">
              Salvar
            </button>
          </div>
        </div>
      ) : caption ? (
        <p className="px-4 pb-2 text-[var(--sf-text,#e1e1e6)] text-sm leading-relaxed whitespace-pre-wrap cursor-pointer" onClick={goToPost}>{caption}</p>
      ) : null}

      {/* Image */}
      {imgSrc && (
        <img src={imgSrc} alt="" className="w-full max-h-[500px] object-cover cursor-pointer" loading="lazy" onClick={goToPost} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#323238]/50">
        <button onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-400' : 'text-gray-500 hover:text-white'}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="text-xs font-medium">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
          <MessageCircle size={16} />
          <span className="text-xs font-medium">{commentCount}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <ComentarioSection
          postName={post.name}
          onComment={async (text) => {
            await onComment(post.name, text)
            setCommentCount(c => c + 1)
          }}
          onHideComment={canModerate ? onHideComment : null}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          commentApi={commentApi}
        />
      )}
    </div>
  )
}
