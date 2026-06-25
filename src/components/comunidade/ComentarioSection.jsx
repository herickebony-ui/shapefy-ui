import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, EyeOff, Pencil, Trash2, X, Check, CornerDownRight, ChevronDown } from 'lucide-react'
import { Spinner } from '../ui'
import useAuthSrc from '../../hooks/useAuthSrc'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtTempo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CommentAvatar({ foto, nome, small }) {
  const src = useAuthSrc(foto ? `${FRAPPE_URL}${foto}` : null)
  const sz = small ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-[10px]'
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover border border-[#323238] shrink-0`} />
  return (
    <div className={`${sz} rounded-full bg-[#29292e] flex items-center justify-center text-gray-400 font-bold shrink-0`}>
      {(nome || '?')[0].toUpperCase()}
    </div>
  )
}

function ComentarioItem({
  c, onReply, onEdit, onDelete, onHide,
  editingId, editText, setEditingId, setEditText, onEditSave,
  small = false,
}) {
  const isDeleted = c.deleted

  return (
    <div className={`flex gap-2 ${small ? 'pl-9 py-1.5' : 'py-2'} group`}>
      <CommentAvatar foto={isDeleted ? null : c.author_foto} nome={isDeleted ? '?' : c.author_nome} small={small} />
      <div className="flex-1 min-w-0">
        {isDeleted ? (
          <p className="text-gray-600 text-xs italic">Comentário removido</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-white text-xs font-semibold">{c.author_nome}</span>
              <span className="text-gray-600 text-[10px]">{fmtTempo(c.creation)}</span>
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.is_mine && onEdit && (
                  <button onClick={() => { setEditingId(c.name); setEditText(c.text) }}
                    className="text-gray-600 hover:text-gray-300" title="Editar">
                    <Pencil size={11} />
                  </button>
                )}
                {c.is_mine && onDelete && (
                  <button onClick={() => onDelete(c.name)}
                    className="text-gray-600 hover:text-red-400" title="Excluir">
                    <Trash2 size={11} />
                  </button>
                )}
                {onHide && !c.is_mine && (
                  <button onClick={() => onHide(c.name)}
                    className="text-gray-600 hover:text-red-400" title="Ocultar">
                    <EyeOff size={11} />
                  </button>
                )}
              </div>
            </div>
            {editingId === c.name ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onEditSave(c.name)}
                  className="w-full bg-[#29292e] border border-[#323238] rounded px-2 py-1 text-xs text-white focus:border-[#2563eb] outline-none"
                  maxLength={1000}
                  autoFocus
                />
                <div className="flex gap-1 mt-1 justify-end">
                  <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                  <button onClick={() => onEditSave(c.name)} className="text-[#2563eb] hover:text-blue-300"><Check size={12} /></button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 text-xs leading-relaxed mt-0.5">{c.text}</p>
            )}
            {onReply && !small && (
              <button
                onClick={() => onReply(c)}
                className="text-gray-500 hover:text-[#60A5FA] text-[10px] font-semibold mt-1 flex items-center gap-1"
              >
                Responder
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RepliesBlock({ comment, replyApi, onEdit, onDelete, onHide, editingId, editText, setEditingId, setEditText, onEditSave }) {
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const replyCount = comment._replyCount

  const load = useCallback(async (nextCursor) => {
    if (!replyApi) return
    setLoading(true)
    try {
      const res = await replyApi(comment.name, { cursor: nextCursor, limit: 10 })
      const items = res.replies || []
      if (nextCursor) {
        setReplies(prev => [...prev, ...items])
      } else {
        setReplies(items)
      }
      setHasMore(res.has_more || false)
      if (items.length) setCursor(items[items.length - 1].creation)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [comment.name, replyApi])

  const handleExpand = () => {
    if (!expanded) {
      setExpanded(true)
      load(null)
    } else {
      setExpanded(false)
    }
  }

  if (replyCount <= 0 && replies.length === 0) return null

  return (
    <div className="ml-4">
      <button
        onClick={handleExpand}
        className="flex items-center gap-1 text-[#60A5FA] text-[10px] font-semibold py-1 hover:text-blue-300 transition-colors"
      >
        <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        {expanded ? 'Ocultar respostas' : `Ver ${replyCount} resposta${replyCount > 1 ? 's' : ''}`}
      </button>
      {expanded && (
        <>
          {replies.map(r => (
            <ComentarioItem
              key={r.name}
              c={r}
              small
              onEdit={onEdit}
              onDelete={onDelete}
              onHide={onHide}
              editingId={editingId}
              editText={editText}
              setEditingId={setEditingId}
              setEditText={setEditText}
              onEditSave={onEditSave}
            />
          ))}
          {loading && <div className="flex justify-center py-2"><Spinner /></div>}
          {hasMore && !loading && (
            <button onClick={() => load(cursor)}
              className="text-[#2563eb] text-[10px] font-medium hover:underline pl-9 py-1">
              Carregar mais
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function ComentarioSection({ postName, onComment, onHideComment, onEditComment, onDeleteComment, commentApi, replyApi }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const inputRef = useRef(null)

  const load = useCallback(async (nextCursor) => {
    setLoading(true)
    try {
      const res = await commentApi(postName, { cursor: nextCursor, limit: 20 })
      const items = (res.comments || []).map(c => ({ ...c, _replyCount: c.reply_count || 0 }))
      if (nextCursor) {
        setComments(prev => [...prev, ...items])
      } else {
        setComments(items)
      }
      setHasMore(res.has_more || false)
      if (items.length) {
        setCursor(items[items.length - 1].creation)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [postName, commentApi])

  useEffect(() => { load(null) }, [load])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onComment(text.trim(), replyingTo?.name || null)
      setText('')
      if (replyingTo) {
        setComments(prev => prev.map(c =>
          c.name === replyingTo.name ? { ...c, _replyCount: (c._replyCount || 0) + 1 } : c
        ))
        setReplyingTo(null)
      }
      load(null)
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  const handleReply = (comment) => {
    setReplyingTo({ name: comment.name, author_nome: comment.author_nome })
    inputRef.current?.focus()
  }

  const handleHide = async (commentName) => {
    if (!onHideComment) return
    try {
      await onHideComment(commentName)
      setComments(prev => prev.filter(c => c.name !== commentName))
    } catch { /* ignore */ }
  }

  const handleEditSave = async (commentName) => {
    if (!editText.trim() || !onEditComment) return
    try {
      await onEditComment(commentName, editText.trim())
      setComments(prev => prev.map(c => c.name === commentName ? { ...c, text: editText.trim() } : c))
      setEditingId(null)
    } catch { /* ignore */ }
  }

  const handleDeleteComment = async (commentName) => {
    if (!confirm('Excluir este comentário?') || !onDeleteComment) return
    try {
      await onDeleteComment(commentName)
      setComments(prev => {
        const target = prev.find(c => c.name === commentName)
        if (target && (target._replyCount || 0) > 0) {
          return prev.map(c => c.name === commentName ? { ...c, deleted: true, text: '', is_mine: false } : c)
        }
        return prev.filter(c => c.name !== commentName)
      })
    } catch { /* ignore */ }
  }

  return (
    <div className="border-t border-[#323238]/50">
      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {comments.map(c => (
            <div key={c.name} className="px-4">
              <ComentarioItem
                c={c}
                onReply={replyApi ? handleReply : null}
                onEdit={onEditComment}
                onDelete={handleDeleteComment}
                onHide={onHideComment ? handleHide : null}
                editingId={editingId}
                editText={editText}
                setEditingId={setEditingId}
                setEditText={setEditText}
                onEditSave={handleEditSave}
              />
              {replyApi && (c._replyCount > 0 || c.deleted) && (
                <RepliesBlock
                  comment={c}
                  replyApi={replyApi}
                  onEdit={onEditComment}
                  onDelete={handleDeleteComment}
                  onHide={onHideComment ? handleHide : null}
                  editingId={editingId}
                  editText={editText}
                  setEditingId={setEditingId}
                  setEditText={setEditText}
                  onEditSave={handleEditSave}
                />
              )}
            </div>
          ))}
          {hasMore && (
            <button onClick={() => load(cursor)}
              className="w-full text-center py-2 text-[#2563eb] text-xs font-medium hover:underline">
              Carregar mais
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#323238]/50">
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 pt-2">
            <CornerDownRight size={12} className="text-[#60A5FA] shrink-0" />
            <span className="text-[#60A5FA] text-[10px] font-semibold truncate">
              Respondendo a {replyingTo.author_nome}
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white ml-auto shrink-0">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={replyingTo ? 'Escreva uma resposta...' : 'Escreva um comentário...'}
            className="flex-1 bg-[#29292e] border border-[#323238] rounded-lg px-3 h-9 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] outline-none transition-colors"
            maxLength={1000}
          />
          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#2563eb] text-white disabled:opacity-40 transition-opacity shrink-0">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
